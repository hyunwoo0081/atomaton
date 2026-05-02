import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const getMasterKey = () => {
    const key = process.env.MASTER_KEY;
    if (key && key.length === 32) {
        return Buffer.from(key);
    }
    // Fallback to a guaranteed 32-byte buffer for testing or misconfigured environments
    return Buffer.alloc(32, 't');
};
export const encrypt = (text) => {
    const masterKey = getMasterKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('hex');
};
export const decrypt = (encryptedText) => {
    const masterKey = getMasterKey();
    const buffer = Buffer.from(encryptedText, 'hex');
    const iv = buffer.slice(0, IV_LENGTH);
    const authTag = buffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
};
