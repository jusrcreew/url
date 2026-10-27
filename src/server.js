const path = require('path');
const { createDb } = require('./db');
const { createStore } = require('./store');
const { createApp } = require('./app');

async function main() {
  const port = Number(process.env.PORT) || 4317;
  const filename = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'urls.db');
  const db = await createDb({ filename });
  const store = await createStore(db);
  const app = createApp(store);

  await new Promise((resolve) => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`Коротко слушает http://127.0.0.1:${port}`);
      resolve();
    });
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main };