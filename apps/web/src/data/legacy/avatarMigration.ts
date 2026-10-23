import { api } from '../api/client';
import type { CharacterRepository } from '../local/characterRepository';

/**
 * Sheets from before uploaded art carry their portrait as a data URL inside the document, which
 * makes every sync carry the image. Uploads such portraits once and keeps only the reference.
 * Runs online; a failure leaves the sheet as it was and is retried on the next start.
 */
export async function moveEmbeddedPortraits(repository: CharacterRepository): Promise<number> {
  let moved = 0;
  for (const character of await repository.list()) {
    if (!character.avatar?.startsWith('data:image/') || character.images?.portrait) continue;
    try {
      const blob = await (await fetch(character.avatar)).blob();
      const asset = await api.assets.upload(blob);
      const updated = await repository.update(character.id, (doc) => {
        const { avatar: _avatar, ...rest } = doc;
        return { ...rest, images: { ...doc.images, portrait: asset.id } };
      });
      if (updated) moved += 1;
    } catch (error) {
      console.warn(`Portrait of ${character.name} stays embedded for now`, error);
    }
  }
  return moved;
}
