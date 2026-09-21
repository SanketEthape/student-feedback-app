const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

// 32-byte key from env (hex string or derived via SHA-256)
const getKey = () => {
    let raw = (process.env.ENCRYPTION_KEY || '').trim().replace(/^["']|["']$/g, '');
    if (!raw) {
        throw new Error('ENCRYPTION_KEY environment variable is missing');
    }
    // If exact 64-char hex string, parse directly
    if (raw.length === 64 && /^[0-9a-fA-F]{64}$/.test(raw)) {
        return Buffer.from(raw, 'hex');
    }
    // Flexible fallback: derive consistent 32-byte key from whatever ENCRYPTION_KEY is provided
    return crypto.createHash('sha256').update(raw).digest();
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
