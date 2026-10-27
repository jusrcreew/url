const path = require('path');
const express = require('express');
const { cleanOriginal, redirectTarget } = require('./validate');
const { CODE_LENGTH } = require('./codes');

const INDEX = path.join(__dirname, '..', 'public', 'index.html');
const CODE_PATTERN = new RegExp(`^[0-9A-Za-z]{${CODE_LENGTH}}$`);

function readOriginal(req) {
  const value = req.query.url;
  if (Array.isArray(value)) return cleanOriginal(value[0]);
  return cleanOriginal(value);
}

function absoluteShort(req, code) {
  return `${req.protocol}://${req.get('host')}/${code}`;
}

function sendCreated(req, res, result) {
  if (result.created === false) {
    res.json({ original: result.original, created: false });
    return;
  }
  res.json({
    original: result.original,
    short: absoluteShort(req, result.code),
    created: result.created,
  });
}

function sendRefresh(req, res, result) {
  if (result.refresh !== true) {
    res.json({ original: result.original, refresh: result.refresh });
    return;
  }
  res.json({
    original: result.original,
    short: absoluteShort(req, result.code),
    refresh: true,
  });
}

function sendAlias(req, res, result) {
  if (Object.prototype.hasOwnProperty.call(result, 'created')) {
    sendCreated(req, res, result);
    return;
  }
  if (result.alias !== true) {
    res.json({ original: result.original, alias: false });
    return;
  }
  res.json({
    original: result.original,
    short: absoluteShort(req, result.code),
    alias: true,
  });
}

function sendRemoved(res, result) {
  res.json({ original: result.original, deleted: result.deleted });
}

function createApp(store) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/', (req, res) => {
    res.sendFile(INDEX);
  });

  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  app.get('/create', async (req, res) => {
    const original = readOriginal(req);
    try {
      sendCreated(req, res, await store.create(original));
    } catch (error) {
      console.error(error);
      res.json({ original, created: false });
    }
  });

  app.get('/refresh', async (req, res) => {
    const original = readOriginal(req);
    try {
      sendRefresh(req, res, await store.refresh(original));
    } catch (error) {
      console.error(error);
      res.json({ original, refresh: false });
    }
  });

  app.get('/alias', async (req, res) => {
    const original = readOriginal(req);
    try {
      sendAlias(req, res, await store.alias(original));
    } catch (error) {
      console.error(error);
      res.json({ original, alias: false });
    }
  });

  app.get('/remove', async (req, res) => {
    const original = readOriginal(req);
    try {
      sendRemoved(res, await store.remove(original));
    } catch (error) {
      console.error(error);
      res.json({ original, deleted: false });
    }
  });

  app.get('/:code', async (req, res) => {
    const code = req.params.code;
    if (!CODE_PATTERN.test(code)) {
      res.status(404).json({ error: 'Сокращённый URL не найден' });
      return;
    }

    try {
      const doc = await store.findByCode(code);
      if (!doc) {
        res.status(404).json({ error: 'Сокращённый URL не найден' });
        return;
      }
      res.redirect(302, redirectTarget(doc.original));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Не удалось выполнить переадресацию' });
    }
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Не найдено' });
  });

  return app;
}

module.exports = { createApp };