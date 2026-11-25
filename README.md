# Valkor Store

React / Express / tRPC / Drizzle starter adapted from the Sandbox web-db-user template. The application database uses PostgreSQL through `postgres.js`, prefers `NEON_DATABASE_URL`, and accepts `DATABASE_URL` only when it contains a valid PostgreSQL URL.

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:generate`: generate PostgreSQL migration files from the Drizzle schema; does not connect to a database.
- `pnpm db:migrate`: apply active PostgreSQL migrations; requires `CONFIRM_NEON_MIGRATIONS=1` in the current shell and a valid PostgreSQL URL. The wrapper blocks non-PostgreSQL URLs and redacts connection credentials from command output.
- `pnpm db:push`: generate then apply migrations through the same confirmation guard.
- `pnpm db:seed`: optional one-time starter settings for a newly created empty database only; never run on an existing database without explicit review.
- `pnpm check` / `pnpm test`: types and application tests.

Set the confirmation variable only for a migration that has been intentionally reviewed and approved; do not store it in `.env` or a hosting environment. `drizzle-kit migrate` and `drizzle-kit push` are also blocked unless that variable was supplied by the current shell. Never commit `.env` files or share database credentials in chat. The MySQL history is archived under `drizzle/legacy-mysql/` and is not part of the active migration journal. These schema migrations do not copy existing MySQL records.

Start with the Webdev skill's default-template guide. Platform login, storage, payments and service contracts live in its shared references; read the relevant capability before extending its helper.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.

Platform configuration is readable and editable through `webdev.config`. Default settings are initial values, not enforced constraints. The agent may modify the files, commands and configuration or follow the flexible guide for another stack.
