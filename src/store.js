const { randomCode, isReserved } = require('./codes');
const { cleanOriginal, isValidUrl } = require('./validate');

function createLocker() {
  const tails = new Map();

  return function withLock(key, fn) {
    const previous = tails.get(key) || Promise.resolve();
    const run = previous.then(() => fn(), () => fn());
    const tail = run.then(() => {}, () => {});
    tails.set(key, tail);
    return run;
  };
}

function isUniqueViolation(error) {
  return Boolean(error && error.errorType === 'uniqueViolated');
}

class UrlStore {
  constructor(db) {
    this.db = db;
    this.seq = 1;
    this.withLock = createLocker();
  }

  async init() {
    const docs = await this.db.findAsync({});
    const max = docs.reduce((highest, doc) => Math.max(highest, doc.seq || 0), 0);
    this.seq = max + 1;
  }

  async create(original) {
    const value = cleanOriginal(original);
    if (!isValidUrl(value)) return { original: value, created: false };
    return this.withLock(value, () => this.createUnlocked(value));
  }

  async refresh(original) {
    const value = cleanOriginal(original);
    if (!isValidUrl(value)) return { original: value, refresh: false };
    return this.withLock(value, () => this.refreshUnlocked(value));
  }

  async alias(original) {
    const value = cleanOriginal(original);
    if (!isValidUrl(value)) return { original: value, alias: false };
    return this.withLock(value, () => this.aliasUnlocked(value));
  }

  async remove(original) {
    const value = cleanOriginal(original);
    if (!isValidUrl(value)) return { original: value, deleted: false };
    return this.withLock(value, () => this.removeUnlocked(value));
  }

  findByCode(code) {
    return this.db.findOneAsync({ code });
  }

  async createUnlocked(original) {
    const current = await this.primary(original);
    if (current) return { original, code: current.code, created: null };
    const code = await this.allocateCode(original);
    return { original, code, created: true };
  }

  async refreshUnlocked(original) {
    const current = await this.primary(original);
    if (!current) return { original, refresh: null };
    const code = await this.replaceCode(current._id, current.code);
    return { original, code, refresh: true };
  }

  async aliasUnlocked(original) {
    const current = await this.primary(original);
    if (!current) {
      const code = await this.allocateCode(original);
      return { original, code, created: true };
    }
    const code = await this.allocateCode(original);
    return { original, code, alias: true };
  }

  async removeUnlocked(original) {
    const removed = await this.db.removeAsync({ original }, { multi: true });
    const numRemoved = typeof removed === 'number' ? removed : removed?.numRemoved || 0;
    if (!numRemoved) return { original, deleted: null };
    return { original, deleted: true };
  }

  async primary(original) {
    const docs = await this.db.findAsync({ original }).sort({ seq: 1 });
    return docs[0] || null;
  }

  async allocateCode(original) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = randomCode();
      if (isReserved(code)) continue;
      const seq = this.seq++;
      try {
        await this.db.insertAsync({ code, original, seq });
        return code;
      } catch (error) {
        if (isUniqueViolation(error)) continue;
        throw error;
      }
    }
    throw new Error('Не удалось выделить короткий код');
  }

  async replaceCode(id, previousCode) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = randomCode();
      if (isReserved(code) || code === previousCode) continue;
      try {
        const { numAffected } = await this.db.updateAsync({ _id: id }, { $set: { code } }, {});
        if (!numAffected) throw new Error('Запись короткого кода не обновлена');
        return code;
      } catch (error) {
        if (isUniqueViolation(error)) continue;
        throw error;
      }
    }
    throw new Error('Не удалось выделить короткий код');
  }
}

async function createStore(db) {
  const store = new UrlStore(db);
  await store.init();
  return store;
}

module.exports = { createStore, UrlStore };