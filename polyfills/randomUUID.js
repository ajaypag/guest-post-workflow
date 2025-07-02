// polyfills/randomUUID.js
import { v4 as uuidv4 } from 'uuid';

/**
 * Some bundlers replace the real browser `crypto` with a
 * Node-style shim that lacks `randomUUID()`.  If that happens,
 * patch it in at runtime so the rest of the code keeps working.
 */
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  globalThis.crypto = globalThis.crypto || {};
  globalThis.crypto.randomUUID = uuidv4;
}