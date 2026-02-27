# Backend setup

## Local start

1. Copy env file:
   - `cp .env.example .env` (or create manually on Windows).
2. Start Postgres from project root:
   - `docker compose up -d postgres`
3. Install dependencies:
   - `npm install`
4. Apply migrations:
   - `npx prisma migrate dev --name init`
5. Start API:
   - `npm run dev`

## Security checklist

- Configure strong values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- Set `RESEND_API_KEY` and verified sender in `RESEND_FROM`.
- Generate 32-byte key for `CHARACTER_DATA_KEY` and keep it private.
- In production, use HTTPS only and set strict CORS `APP_ORIGIN`.
- Keep refresh tokens in httpOnly cookie and rotate them via `/auth/refresh`.

## Publish system notifications

Use admin endpoint with header `x-admin-key`:

`POST /notifications/publish`

Body example:

```json
{
  "title": "Техработы",
  "message": "В воскресенье с 01:00 до 02:00 UTC сервис может быть недоступен.",
  "type": "maintenance"
}
```
