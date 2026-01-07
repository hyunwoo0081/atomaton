import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// MASTER_KEY should be a 32-byte (256-bit) key
const MASTER_KEY = process.env.MASTER_KEY;

if (!MASTER_KEY || MASTER_KEY.length !== 32) {
  throw new Error('MASTER_KEY environment variable must be a 32-byte string.');
}

export const encrypt = (text: string): string => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(MASTER_KEY), iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine iv, authTag, and encrypted data for storage
  return Buffer.concat([iv, authTag, encrypted]).toString('hex');
};

export const decrypt = (encryptedText: string): string => {
  const buffer = Buffer.from(encryptedText, 'hex');

  const iv = buffer.slice(0, IV_LENGTH);
  const authTag = buffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, Buffer.from(MASTER_KEY), iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString('utf8');
};
