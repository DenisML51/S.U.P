const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const KEY_LENGTH = 6;
const MAX_ATTEMPTS = 12;
export const generateLobbyKey = () => {
    let key = '';
    for (let i = 0; i < KEY_LENGTH; i += 1) {
        const idx = Math.floor(Math.random() * ALPHABET.length);
        key += ALPHABET[idx];
    }
    return key;
};
export const reserveUniqueLobbyKey = async (exists) => {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const candidate = generateLobbyKey();
        const alreadyExists = await exists(candidate);
        if (!alreadyExists) {
            return candidate;
        }
    }
    throw new Error('Unable to allocate unique lobby key');
};
