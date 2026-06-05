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

## Prerequisites

- Node.js 18 or higher
- npm or yarn

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
- **DATABASE_URL**: Database file path (default: `./data/linkguide.db`)
- **PORT**: Server port (default: `3000`)

Example `.env.local`:

```env
SESSION_PASSWORD=your-random-32-character-secret-here
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
