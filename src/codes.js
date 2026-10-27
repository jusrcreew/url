const crypto = require('crypto');

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const CODE_LENGTH = 6;
const RESERVED = new Set(['create', 'refresh', 'alias', 'remove', 'health']);

function randomCode() {
  let code = '';
  while (code.length < CODE_LENGTH) {
    const bytes = crypto.randomBytes(16);
    for (const byte of bytes) {
      if (byte >= ALPHABET.length * 4) continue;
      code += ALPHABET[byte % ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }
  return code;
}

function isReserved(code) {
  return RESERVED.has(String(code).toLowerCase());
}

module.exports = { randomCode, isReserved, CODE_LENGTH };