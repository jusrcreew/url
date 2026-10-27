const fs = require('fs');
const path = require('path');
const Datastore = require('@seald-io/nedb');

async function createDb(options = {}) {
  const config = { timestampData: true };

  if (options.inMemoryOnly || !options.filename) {
    config.inMemoryOnly = true;
  } else {
    fs.mkdirSync(path.dirname(options.filename), { recursive: true });
    config.filename = options.filename;
  }

  const db = new Datastore(config);
  await db.loadDatabaseAsync();
  await db.ensureIndexAsync({ fieldName: 'code', unique: true });
  await db.ensureIndexAsync({ fieldName: 'original' });
  return db;
}

module.exports = { createDb };