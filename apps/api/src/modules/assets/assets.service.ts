import { ErrorCode } from '@itd/schema';
import { and, eq, sql } from 'drizzle-orm';
import sharp from 'sharp';
import type { Database } from '../../db/client';
import { assets } from '../../db/schema';
import { AppError, notFound } from '../../lib/errors';

/** Longest side kept for uploaded art; enough for a full-height hero on a 1440p screen. */
const MAX_DIMENSION = 2048;
const WEBP_QUALITY = 84;
/** Unreferenced uploads younger than this survive: the client may not have saved the sheet yet. */
const ORPHAN_GRACE = '1 day';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export interface AssetDto {
  id: string;
  url: string;
  width: number;
  height: number;
}

export interface StoredAsset {
  contentType: string;
  bytes: Buffer;
}

export const assetUrl = (id: string) => `/api/assets/${id}`;

export class AssetsService {
  constructor(private readonly db: Database) {}

  /** Normalises an uploaded image (orientation, size, WebP) and stores it for the user. */
  async upload(userId: string, input: Buffer): Promise<AssetDto> {
    let image: { data: Buffer; info: sharp.OutputInfo };
    try {
      image = await sharp(input, { failOn: 'error', limitInputPixels: 64_000_000 })
        .rotate()
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new AppError(400, ErrorCode.validation, 'Файл не является поддерживаемым изображением');
    }

    const [row] = await this.db
      .insert(assets)
      .values({
        userId,
        contentType: 'image/webp',
        width: image.info.width,
        height: image.info.height,
        size: image.data.length,
        bytes: image.data,
      })
      .returning({ id: assets.id, width: assets.width, height: assets.height });
    return { id: row!.id, url: assetUrl(row!.id), width: row!.width, height: row!.height };
  }

  async get(id: string): Promise<StoredAsset> {
    const [row] = await this.db
      .select({ contentType: assets.contentType, bytes: assets.bytes })
      .from(assets)
      .where(eq(assets.id, id));
    if (!row) throw notFound('Изображение не найдено');
    return row;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.db.delete(assets).where(and(eq(assets.id, id), eq(assets.userId, userId)));
  }

  /**
   * Deletes uploads no character, restore point, party cover or NPC refers to. Referenced ids are read from the
   * documents themselves, so the documents stay the single source of truth.
   */
  async collectGarbage(): Promise<number> {
    const result = await this.db.execute(sql`
      DELETE FROM assets a
      WHERE a.created_at < now() - ${ORPHAN_GRACE}::interval
        AND NOT EXISTS (
          SELECT 1 FROM characters c
          WHERE c.user_id = a.user_id
            AND a.id::text IN (c.data->'images'->>'full', c.data->'images'->>'portrait')
        )
        AND NOT EXISTS (
          SELECT 1 FROM character_revisions r
          WHERE r.user_id = a.user_id
            AND a.id::text IN (r.data->'images'->>'full', r.data->'images'->>'portrait')
        )
        AND NOT EXISTS (SELECT 1 FROM parties p WHERE p.cover_asset_id = a.id)
        AND NOT EXISTS (SELECT 1 FROM party_npcs n WHERE n.portrait_asset_id = a.id)
    `);
    return result.count ?? 0;
  }
}
