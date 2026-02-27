import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { env } from '../env.js';

const key = Buffer.from(env.CHARACTER_DATA_KEY, 'base64');
if (key.length !== 32) {
  throw new Error('CHARACTER_DATA_KEY must decode to exactly 32 bytes');
}

export const hashValue = async (input: string): Promise<string> => argon2.hash(input);
export const verifyHash = async (hash: string, input: string): Promise<boolean> => argon2.verify(hash, input);

export const sha256 = (input: string): string => createHash('sha256').update(input).digest('hex');

export const encryptJson = (value: unknown) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const json = JSON.stringify(value);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encryptedPayload: encrypted.toString('base64'),
    payloadIv: iv.toString('base64'),
    payloadTag: tag.toString('base64')
  };
};

export const decryptJson = <T>(encryptedPayload: string, payloadIv: string, payloadTag: string): T => {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payloadIv, 'base64'));
  decipher.setAuthTag(Buffer.from(payloadTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload, 'base64')),
    decipher.final()
  ]);
  return JSON.parse(decrypted.toString('utf8')) as T;
};

export const generateNumericCode = (): string => `${Math.floor(100000 + Math.random() * 900000)}`;
