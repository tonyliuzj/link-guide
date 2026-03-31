# Link Guide

Link Guide is a Next.js URL shortener with a SQLite backend, multi-domain support, and a lightweight admin panel for redirects and settings.

## Highlights

- Create and manage short links from a web UI or API.
- Store runtime data in `data/link-guide.sqlite` instead of the project root.
- Configure domains, primary-domain redirects, Turnstile, and admin credentials from the admin panel.
- Seed first-run defaults from `.env.local`, then manage them in the database.

## One-Click Install

```bash
curl -sSL https://github.com/tonyliuzj/link-guide/releases/latest/download/link-guide.sh -o link-guide.sh && chmod +x link-guide.sh && bash link-guide.sh
```

The installer now has two menus:

- First menu: choose `Direct install (systemd)` or `Docker install (Compose)`.
- Second menu: choose `Install`, `Update`, `Start`, `Stop`, `Restart`, `Status`, `Logs`, or `Uninstall` for the selected deployment type.

Direct mode clones the project into `~/link-guide`, writes `.env.local`, builds the app, and installs a `systemd` service named `link-guide.service`.
Docker mode clones the project, writes `.env.local` plus a Compose `.env`, and manages the app with `docker compose`.

## Manual Setup

```bash
git clone https://github.com/tonyliuzj/link-guide.git
cd link-guide
cp example.env.local .env.local
npm ci
npm run dev
```

For production:

```bash
npm run build
npm start -- -p 3000
```

If you want the app managed by `systemd`, create a service that runs the production server from the project directory and points `EnvironmentFile` at `.env.local`.

## Docker

The repo now includes `Dockerfile` and `docker-compose.yml`.

Manual Docker startup:

```bash
cp example.env.local .env.local
printf 'HOST_PORT=3000\n' > .env
docker compose up -d --build
```

Docker stores the SQLite database in the bind-mounted `./data` directory, which maps to `/app/data` inside the container.

## Environment

```ini
SESSION_PASSWORD=complex_password_at_least_32_chars
PORT=3000
DATABASE_PATH=data/link-guide.sqlite

ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme

DOMAINS=localhost:3000
PRIMARY_DOMAIN=localhost:3000

NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
TURNSTILE_ENABLED=false
```

`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `DOMAINS`, `PRIMARY_DOMAIN`, and Turnstile values are used as first-run seed data. After the database exists, manage those values from `/admin/settings`.

## Project Structure

```text
link-guide/
├── .dockerignore
├── Dockerfile
├── data/
│   └── link-guide.sqlite   # runtime SQLite database
├── docker-compose.yml
├── link-guide.sh           # installer/update/uninstall helper
├── example.env.local
├── package.json
└── src/
    ├── components/
    ├── data/
    │   └── database.js     # SQLite bootstrap and seed logic
    ├── lib/
    │   ├── domainMiddleware.js
    │   ├── session.js
    │   └── utils.ts
    ├── pages/
    └── styles/
```

## Notes

- A legacy root-level `db.sqlite` is moved into `data/link-guide.sqlite` automatically on first startup.
- Migration scripts were removed; schema setup now lives in `src/data/database.js`.
- Direct mode uses `systemd`; logs are available through `journalctl -u link-guide.service`.
- Docker mode uses `docker compose`; container logs are available through `docker compose logs -f`.

## License

[MIT](LICENSE)
