function cleanOriginal(input) {
  if (typeof input !== 'string') return '';
  return input.trim();
}

function isValidUrl(input) {
  const value = cleanOriginal(input);
  if (!value || value.length > 2048) return false;
  if (/[\u0000-\u001F\u007F]/.test(value) || /\s/u.test(value)) return false;
  if (value.includes('\\') || value.startsWith('/')) return false;

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);
  if (hasScheme && !/^https?:\/\//i.test(value)) return false;

  const enteredHost = extractHost(value);
  if (!enteredHost) return false;
  if (/^\d+$/.test(enteredHost) || /^0x[0-9a-f]+$/i.test(enteredHost)) return false;

  let parsed;
  try {
    parsed = new URL(hasScheme ? value : `http://${value}`);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  let host = parsed.hostname.toLowerCase();
  if (host.endsWith('.')) host = host.slice(0, -1);
  if (!host) return false;
  if (host === 'localhost') return true;
  if (host.includes(':')) return true;
  if (isIpv4(host)) return enteredHost === host;

  const labels = host.split('.');
  if (labels.length < 2) return false;
  if (!labels.every(isDnsLabel)) return false;
  return isTld(labels[labels.length - 1]);
}

function extractHost(value) {
  let rest = value.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  rest = rest.split(/[/?#]/)[0];
  const at = rest.lastIndexOf('@');
  if (at !== -1) rest = rest.slice(at + 1);
  if (rest.startsWith('[')) {
    const end = rest.indexOf(']');
    return end === -1 ? '' : rest.slice(1, end).toLowerCase();
  }
  const colon = rest.lastIndexOf(':');
  if (colon !== -1) rest = rest.slice(0, colon);
  if (rest.endsWith('.')) rest = rest.slice(0, -1);
  return rest.toLowerCase();
}

function isIpv4(host) {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isDnsLabel(label) {
  return label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
}

function isTld(label) {
  return /^[a-z]{2,63}$/.test(label) || /^xn--[a-z0-9-]{2,59}$/.test(label);
}

function redirectTarget(original) {
  if (/^https?:\/\//i.test(original)) return original;
  return `http://${original}`;
}

module.exports = { cleanOriginal, isValidUrl, redirectTarget };