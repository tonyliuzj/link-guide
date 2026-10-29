# LinkGuide

A modern, self-hosted URL shortener with advanced features including multiple redirect modes, password protection, custom pages, and Cloudflare Turnstile integration.

## Features

- **Multiple Redirect Modes**: Simple redirect, custom landing pages, password-protected links
- **Multi-Domain Support**: Manage multiple domains from a single dashboard
- **Analytics**: Track clicks, referrers, countries and browsers, export a link's clicks as CSV, and set how long statistics are kept
- **Role-Based Access**: Admin and user roles with granular permissions
- **Guest Link Creation**: Allow public link creation on specific domains
- **Cloudflare Turnstile**: Optional bot protection (configured per-domain in app)
- **Link Expiration**: Set expiration dates for temporary links
- **Blacklist Management**: Prevent specific short codes from being used
- **Email (optional SMTP)**: Password reset, signup email verification and confirmed email changes
- **Backup & Restore**: Download the whole database and restore it from the dashboard
- **Built-in protection**: Rate limiting on sensitive endpoints, secure sessions and security headers (see [Security](#security))

## Quick Install

For automated installation on Linux servers:

```bash
curl -fsSL --retry 5 --retry-delay 5 --retry-all-errors https://github.com/tonyliuzj/link-guide/releases/latest/download/link-guide.sh -o link-guide.sh && chmod +x link-guide.sh && bash link-guide.sh
```

The download is retried automatically because the file is briefly unavailable while a new version is being published.

This will download and run the installer, which supports both systemd and Docker deployments.
Choose **Docker install (Compose)** in the installer to run the published Docker image.

The installer shows a menu: **Install**, **Update**, **Start**, **Stop**, **Restart**, **Status**, **Logs** and **Uninstall**.

### Updating

Run the installer again and choose **Update**. It pulls the latest code, then:

- **Docker installs** stop a leftover direct (systemd) service if there is one, pull the newest image and restart the containers. If the host port is still being released by the old container, starting is retried automatically.
- **Direct installs** reinstall dependencies, rebuild the app and restart the systemd service.

Local edits to `package-lock.json` are discarded during an update. Any other locally modified file is stashed (not lost); restore it afterwards with `git stash pop`.

Always download a fresh `link-guide.sh` with the command above before updating, so you run the newest installer. Existing databases are migrated automatically on the next start.

## Docker

The Docker image is published to Docker Hub for `linux/amd64` and `linux/arm64`:

```text
tonyliuzj/link-guide:latest
tonyliuzj/link-guide:<commit-sha>
```

A new image is published after every push to `main`, once lint, type checking and tests pass.

### Docker Run

```bash
docker run -d \
  --name link-guide \
  --restart unless-stopped \
  -p 3000:3000 \
  -v link-guide-data:/app/data \
  -e SESSION_PASSWORD="$(openssl rand -base64 32)" \
  -e AUTH_TRUST_HOST=true \
  -e DATABASE_URL=/app/data/link-guide.sqlite \
  tonyliuzj/link-guide:latest
```

Visit `http://localhost:3000/setup` after the container starts.

### Docker Compose

```bash
git clone https://github.com/tonyliuzj/link-guide.git
cd link-guide
cp example.env.local .env.local
```

Edit `.env.local` for Docker (see [Environment variables](#environment-variables) for everything you can set, including SMTP):

```env
SESSION_PASSWORD=replace-with-openssl-rand-base64-32
AUTH_TRUST_HOST=true
DATABASE_URL=/app/data/link-guide.sqlite
PORT=3000
```

Optional Compose settings go in `.env`:

```env
HOST_PORT=3000
CONTAINER_PORT=3000
DOCKER_IMAGE=tonyliuzj/link-guide:latest
```

Start with the Docker Hub image:

```bash
docker compose pull
docker compose up -d --no-build
```

Or build locally from the checkout:

```bash
docker compose build
docker compose up -d --no-build
```

To update later, run `docker compose pull && docker compose up -d --no-build` again. The database lives in `./data`, which is kept across updates.

Useful commands:

```bash
docker compose ps
docker compose logs -f
docker compose down
```

## Prerequisites

- Docker and Docker Compose for Docker installs
- Node.js 20.9 or higher (22 recommended, which the Docker image uses) and npm for direct/manual installs

## Manual Setup

### 1. Clone the repository

```bash
git clone https://github.com/tonyliuzj/link-guide.git
cd link-guide
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file and edit it:

```bash
cp example.env.local .env.local
```

Example `.env.local`:

```env
SESSION_PASSWORD=your-random-32-character-secret-here
AUTH_TRUST_HOST=true
DATABASE_URL=./data/linkguide.db
PORT=3000
```

Generate a session secret with `openssl rand -base64 32`. All options are listed under [Environment variables](#environment-variables).

### 4. Build the application

```bash
npm run build
```

### 5. Start the application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### 6. Complete setup wizard

1. Navigate to `http://localhost:3000/setup`
2. Create your admin account
3. Configure your primary domain
4. Set the base path (usually `/`)

The app will create the database automatically if it doesn't exist.

## Configuration

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `SESSION_PASSWORD` | Yes | Random secret used to sign sessions. Generate with `openssl rand -base64 32`. |
| `AUTH_TRUST_HOST` | Recommended | Set to `true` behind reverse proxies, custom domains and production hosts. Host trust is on by default unless this is explicitly `false`. |
| `DATABASE_URL` | No | SQLite file path. Default `./data/linkguide.db` (the installer and Docker use `link-guide.sqlite`). |
| `PORT` | No | Server port. Default `3000`. |
| `APP_URL` | No | Public base URL used in emailed links. Defaults to the site domain from settings. |
| `SMTP_HOST` | For email | SMTP server. Email features turn on when `SMTP_HOST` and `SMTP_FROM` are both set. |
| `SMTP_FROM` | For email | Sender address, for example `LinkGuide <no-reply@example.com>`. |
| `SMTP_PORT` | No | Default `587`. |
| `SMTP_USER`, `SMTP_PASSWORD` | No | Credentials, if your server requires login. |
| `SMTP_SECURE` | No | `true` for implicit TLS, `false` for STARTTLS. Defaults to `true` only on port 465. |

### Nginx Reverse Proxy

If deploying behind nginx, add these headers to your proxy configuration:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

Client IPs (used for rate limiting and click stats) are read from `CF-Connecting-IP`, `X-Real-IP`, or the last `X-Forwarded-For` entry, so run the app behind a proxy that sets one of them.

### Email (SMTP)

Set the SMTP variables above in `.env.local` to enable:

- **Password reset**: "Forgot your password?" appears on the login page. Reset links expire after 1 hour. A successful reset also signs out every existing session.
- **Signup verification**: new self-service signups must confirm their email address (link valid for 24 hours) before they can log in, and can request a new link from the login page. Accounts created before SMTP was configured, by an admin, or during setup count as verified. Without SMTP, signups work immediately.
- **Confirmed email changes**: a user changing their own email on the account page must confirm the new address first; the account keeps its old address until they click the link. Email changes made by an admin on the Users page take effect immediately.
- **No account lookup**: with SMTP, signing up (or changing an email) to an address that already has an account gets the same response as a new one, and the address owner receives an email instead. Without SMTP the form reports "Email already exists".

Under **Settings → Email**, admins can see whether SMTP is configured and send a test message to themselves. This is the quickest way to check your SMTP settings; when sending fails the message includes a hint if `SMTP_SECURE` looks wrong.

### Backup, Restore and Statistics

Under **Settings → Backup & Restore**, admins can download a snapshot of the whole database and restore one from a file. A restore replaces all current data in place, signs everyone out, and saves the previous contents next to the database as `<database file>.pre-restore`. Backups from older versions restore too; columns they lack take their defaults. Backups contain password hashes and Turnstile secret keys, so store them privately.

Settings also has **Keep click statistics for (days)**; older click records are deleted automatically (0 keeps everything). Each link's edit page has an **Export clicks (CSV)** button.

### Turnstile Bot Protection

Cloudflare Turnstile is configured per-domain in the dashboard (not in .env):

1. Go to **Dashboard > Domains**
2. Edit a domain
3. Add your Turnstile site key and secret key
4. Enable Turnstile on individual links as needed

Site-wide Turnstile (guest link creation, login and signup) is configured under **Settings**.

### Domain Management

Manage domains in **Dashboard > Domains**:
- Add multiple domains
- Enable/disable guest link creation
- Configure base response (404 or redirect)
- Set domain-specific Turnstile keys

### User Management

Admin users can manage users in **Dashboard > Users**:
- Create new users with email/password (passwords must be 8 to 128 characters)
- Assign admin or regular user roles
- Delete users (cannot delete yourself or last admin)

Emails are case-insensitive. Demoting or deleting a user takes effect immediately, even for sessions that are already signed in.

### Blacklist

Prevent specific short codes in **Dashboard > Blacklist**. Application routes such as `login`, `signup`, `api`, `forgot-password`, `reset-password` and `verify-email` are reserved by default.

## Security

- **Rate limiting** protects login, signup, password reset, email verification, link password checks, guest link creation, account changes, backup restore and test emails. Counters are stored in the database, so they survive restarts.
- **Sessions** are signed cookies that are re-checked against the database on every request. Password resets and password changes sign out all sessions.
- **Secrets**: Turnstile secret keys are never sent to non-admin users or to visitors, and password hashes are never returned by the API.
- **Login timing** does not reveal whether an email has an account.
- **Headers**: responses include `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options`.
- **Dependencies** are kept up to date; run `npm audit` to check.

## Database

LinkGuide uses SQLite with automatic initialization and migrations. The database and `data/` directory are created automatically on first run.

## Troubleshooting

- **`address already in use` when starting Docker**: if the app was previously installed directly, the installer stops and disables its systemd service first (both modes use the same `data/` folder, so nothing is lost) and retries if the old container is still releasing the port. If something else is using the port, the installer prints the process and its PID. Stop it or change `HOST_PORT` in `.env`.
- **Installer download returns an XML error**: the file is briefly missing while a release is published. Use the download command in [Quick Install](#quick-install), which retries.
- **Emails are not arriving**: use **Settings → Email → Send test email** and read the error. Check `SMTP_SECURE` and the port.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- SQLite (better-sqlite3)
- Auth.js (NextAuth v5)
- Nodemailer
- Tailwind CSS
- Shadcn UI
- Recharts
- Vitest

## Development

```bash
npm run dev      # start the dev server
npm test         # unit and route tests (vitest, uses a temporary SQLite database)
npm run lint
npx tsc --noEmit
```

GitHub Actions runs lint, typecheck and tests before every Docker image publish, and on pull requests.

## License

MIT
