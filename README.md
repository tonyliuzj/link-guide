# LinkGuide

A modern, self-hosted URL shortener with advanced features including multiple redirect modes, password protection, custom pages, and Cloudflare Turnstile integration.

## Features

- **Multiple Redirect Modes**: Simple redirect, custom landing pages, password-protected links
- **Multi-Domain Support**: Manage multiple domains from a single dashboard
- **Analytics**: Track clicks, referrers, and visitor statistics
- **Role-Based Access**: Admin and user roles with granular permissions
- **Guest Link Creation**: Allow public link creation on specific domains
- **Cloudflare Turnstile**: Optional bot protection (configured per-domain in app)
- **Link Expiration**: Set expiration dates for temporary links
- **Blacklist Management**: Prevent specific short codes from being used

## Quick Install

For automated installation on Linux servers:

```bash
curl -sSL https://github.com/tonyliuzj/link-guide/releases/latest/download/link-guide.sh -o link-guide.sh && chmod +x link-guide.sh && bash link-guide.sh
```

This will download and run the installer, which supports both systemd and Docker deployments.
Choose **Docker install (Compose)** in the installer to run the published Docker image.

## Docker

The Docker image is published to Docker Hub:

```text
tonyliuzj/link-guide:latest
tonyliuzj/link-guide:0.1.0
```

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

Edit `.env.local` for Docker:

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

Useful commands:

```bash
docker compose ps
docker compose logs -f
docker compose down
```

## Prerequisites

- Docker and Docker Compose for Docker installs
- Node.js 18 or higher and npm for direct/manual installs

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

Copy the example environment file:

```bash
cp example.env.local .env.local
```

Edit `.env.local` and set:

- **SESSION_PASSWORD**: A random secret string for session encryption
  - Generate with: `openssl rand -base64 32`
- **AUTH_TRUST_HOST**: Set to `true` for reverse proxies, custom domains, and production hosts. The app defaults Auth.js host trust on unless this is explicitly set to `false`.
- **DATABASE_URL**: Database file path (default: `./data/linkguide.db`)
- **PORT**: Server port (default: `3000`)

Example `.env.local`:

```env
SESSION_PASSWORD=your-random-32-character-secret-here
AUTH_TRUST_HOST=true
DATABASE_URL=./data/linkguide.db
PORT=3000
```

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

## Automated Deployment

For automated deployment on Linux servers with systemd or Docker:

```bash
bash link-guide.sh
```

The installer supports:
- Direct deployment with systemd service
- Docker deployment with Docker Compose

## Configuration

### Nginx Reverse Proxy

If deploying behind nginx, add these headers to your proxy configuration:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
```

### Turnstile Bot Protection

Cloudflare Turnstile is configured per-domain in the dashboard (not in .env):

1. Go to **Dashboard > Domains**
2. Edit a domain
3. Add your Turnstile site key and secret key
4. Enable Turnstile on individual links as needed

### Domain Management

Manage domains in **Dashboard > Domains**:
- Add multiple domains
- Enable/disable guest link creation
- Configure base response (404 or redirect)
- Set domain-specific Turnstile keys

### User Management

Admin users can manage users in **Dashboard > Users**:
- Create new users with email/password
- Assign admin or regular user roles
- Delete users (cannot delete yourself or last admin)

### Blacklist

Prevent specific short codes in **Dashboard > Blacklist** to protect system routes.

## Database

LinkGuide uses SQLite with automatic initialization. The database and `data/` directory are created automatically on first run.

## Tech Stack

- Next.js 16.2.7 (App Router)
- TypeScript
- SQLite (better-sqlite3)
- NextAuth.js
- Tailwind CSS
- Shadcn UI
- Recharts

## License

MIT
