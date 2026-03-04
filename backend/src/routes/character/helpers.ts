import { prisma } from '../../prisma.js';
import { decryptJson, encryptJson } from '../../utils/crypto.js';
import type { Character } from '../../../../game-logic/src/types.js';

export type CharacterRow = {
  id: string;
  encryptedPayload: string;
  payloadIv: string;
  payloadTag: string;
};

export const findCharacterRow = async (
  id: string,
  userId: string
): Promise<CharacterRow | null> => {
  return prisma.character.findFirst({
    where: { id, userId },
    select: { id: true, encryptedPayload: true, payloadIv: true, payloadTag: true },
  });
};

export const decryptCharacter = (row: CharacterRow): Character => {
  return decryptJson<Character>(row.encryptedPayload, row.payloadIv, row.payloadTag);
};

export const saveCharacter = async (
  id: string,
  character: Character
): Promise<void> => {
  const encrypted = encryptJson(character);
  await prisma.character.update({
    where: { id },
    data: {
      name: character.name,
      class: character.class,
      level: character.level,
      ...encrypted,
    },
  });
};

/**
 * Load character, apply a pure mutation function, persist, and return the updated character.
 * Throws 'NOT_FOUND' if the character doesn't belong to the user.
 */
export const withCharacter = async (
  id: string,
  userId: string,
  mutator: (char: Character) => Character | Promise<Character>
): Promise<Character> => {
  const row = await findCharacterRow(id, userId);
  if (!row) throw Object.assign(new Error('Character not found'), { code: 'NOT_FOUND' });

  const character = decryptCharacter(row);
  const updated = await mutator(character);
  await saveCharacter(id, updated);
  return updated;
};

export const notFound = (reply: { code: (n: number) => { send: (b: unknown) => unknown } }) =>
  reply.code(404).send({ message: 'Character not found' });

export const getUserId = (request: { user: unknown }): string =>
  (request.user as { sub: string }).sub;
