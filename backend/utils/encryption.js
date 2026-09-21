const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

// 32-byte key from env (hex string → buffer)
const getKey = () => {
    const hex = process.env.ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(hex, 'hex');
};

/**
 * Encrypt a plain-text string (e.g. a Gemini API key).
 * Returns `iv_hex:ciphertext_hex` stored in DB.
 * Returns empty string if input is empty/null.
 */
const encrypt = (text) => {
    if (!text) return '';
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
    ]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Decrypt a stored `iv_hex:ciphertext_hex` string.
 * Returns the original plain text.
 * Returns empty string if input is empty/null or not in expected format.
 */
const decrypt = (stored) => {
    if (!stored) return '';
    const parts = stored.split(':');
    if (parts.length !== 2) return '';
    try {
        const key = getKey();
        const iv = Buffer.from(parts[0], 'hex');
        const ciphertext = Buffer.from(parts[1], 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        const decrypted = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
        ]);
        return decrypted.toString('utf8');
    } catch {
        return '';
    }
};

module.exports = { encrypt, decrypt };
