import { z } from 'zod';
import { EntityIdSchema } from './character';
import type { PartyMessageDto } from './party';

/**
 * HTTP and WebSocket contracts between the web client and the API. Request schemas are validated
 * by the server; response types are what the client can rely on.
 */

export const ErrorCode = {
  validation: 'validation_error',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  notFound: 'not_found',
  conflict: 'conflict',
  emailTaken: 'email_taken',
  invalidCredentials: 'invalid_credentials',
  rateLimited: 'rate_limited',
  payloadTooLarge: 'payload_too_large',
  internal: 'internal_error',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ErrorResponse {
  error: ErrorCode;
  message: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------------------------

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Некорректный email').max(254));
export const PasswordSchema = z
  .string()
  .min(8, 'Пароль должен быть не короче 8 символов')
  .max(128, 'Пароль должен быть не длиннее 128 символов');
export const DisplayNameSchema = z
  .string()
  .trim()
  .min(1, 'Укажите имя')
  .max(64, 'Имя должно быть не длиннее 64 символов');

export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  displayName: DisplayNameSchema,
});
export type RegisterRequest = z.input<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.input<typeof LoginRequestSchema>;

export const UpdateProfileRequestSchema = z.object({
  displayName: DisplayNameSchema,
});
export type UpdateProfileRequest = z.input<typeof UpdateProfileRequestSchema>;

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: PasswordSchema,
});
export type ChangePasswordRequest = z.input<typeof ChangePasswordRequestSchema>;

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthResponse {
  user: UserDto;
  accessToken: string;
  /** ISO timestamp; the client refreshes shortly before it. */
  accessTokenExpiresAt: string;
}

// ---------------------------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------------------------

export const CharacterIdParamsSchema = z.object({ id: EntityIdSchema });

/** Sync cursors are per-user change counters, sent as decimal strings. */
export const CursorSchema = z.string().regex(/^\d{1,18}$/, 'Некорректный курсор');

export const SyncQuerySchema = z.object({
  since: CursorSchema.default('0'),
});

/**
 * `data` is validated by the route with `CharacterSchema` rather than here, so that a client on an
 * older schema version gets a precise error instead of a generic body mismatch.
 */
export const PutCharacterRequestSchema = z.object({
  /** Revision the client edited; `null` when it believes the character is new. */
  baseRevision: z.number().int().min(1).nullable(),
  data: z.unknown(),
});
export type PutCharacterRequest = z.input<typeof PutCharacterRequestSchema>;

export const DeleteCharacterQuerySchema = z.object({
  baseRevision: z.coerce.number().int().min(1),
});

export const RevisionParamsSchema = z.object({
  id: EntityIdSchema,
  revision: z.coerce.number().int().min(1),
});

export interface CharacterRecordDto {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  /** Set for deleted characters (tombstones); `data` is then `null`. */
  deletedAt: string | null;
  /** The stored document. Clients must pass it through `migrateCharacter`. */
  data: unknown;
}

export interface SyncResponse {
  items: CharacterRecordDto[];
  /** Pass back as `since` on the next pull. */
  cursor: string;
  /** `true` when the page was truncated and the client should pull again right away. */
  hasMore: boolean;
}

export interface ConflictResponse extends ErrorResponse {
  error: typeof ErrorCode.conflict;
  /** The server's current record, so the client can merge without another round trip. */
  current: CharacterRecordDto;
}

export interface CharacterRevisionSummaryDto {
  revision: number;
  savedAt: string;
  name: string;
  level: number;
}

export interface CharacterRevisionDto {
  revision: number;
  savedAt: string;
  /** The document as it was; pass through `migrateCharacter` before use. */
  data: unknown;
}

/** An entry of the trash: a deleted character that can still be restored. */
export interface DeletedCharacterDto {
  id: string;
  name: string;
  level: number;
  revision: number;
  deletedAt: string;
}

// ---------------------------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------------------------

export const WsClientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('auth'), token: z.string().min(1).max(4096) }),
  z.object({ type: z.literal('ping') }),
]);
export type WsClientMessage = z.infer<typeof WsClientMessageSchema>;

export type WsServerMessage =
  | { type: 'ready'; userId: string }
  | { type: 'pong' }
  | { type: 'characters.changed'; cursor: string; originSessionId: string | null }
  /** Something in a party changed (or the viewer left it): fetch it again. */
  | { type: 'party.changed'; partyId: string }
  /** A message for this user at a party's table (public, or private to them). */
  | { type: 'party.message'; partyId: string; message: PartyMessageDto }
  | { type: 'error'; error: ErrorCode; message: string };
