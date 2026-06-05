#!/bin/bash

set -euo pipefail

# ============================================================
# TEMPLATE CONFIG
# Replace these placeholder values, or override them with env vars.
# Example:
#   APP_NAME=my-app GIT_REPO=https://github.com/me/my-app.git bash installer.sh
# ============================================================

APP_NAME="${APP_NAME:-linkguide}"
APP_TITLE="${APP_TITLE:-LinkGuide}"
GIT_REPO="${GIT_REPO:-https://github.com/tonyliuzj/link-guide.git}"

RUN_USER="${SUDO_USER:-$USER}"
RUN_GROUP="$(id -gn "$RUN_USER")"

APP_ENV_FILE="${APP_ENV_FILE:-.env.local}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

DIRECT_DATABASE_PATH="${DIRECT_DATABASE_PATH:-data/${APP_NAME}.sqlite}"
DOCKER_DATABASE_PATH="${DOCKER_DATABASE_PATH:-/app/data/${APP_NAME}.sqlite}"

CONTAINER_PORT="${CONTAINER_PORT:-3000}"
SERVICE_NAME="${SERVICE_NAME:-${APP_NAME}.service}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}"

NODESOURCE_NODE_VERSION="${NODESOURCE_NODE_VERSION:-22.x}"
NODESOURCE_KEYRING="/usr/share/keyrings/nodesource.gpg"
NODESOURCE_KEY_URL="https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key"

DEFAULT_ADMIN_USERNAME="${DEFAULT_ADMIN_USERNAME:-admin}"
DEFAULT_ADMIN_PASSWORD="${DEFAULT_ADMIN_PASSWORD:-changeme}"

# Wait 1 second before major steps to mock/show install progress.
# Set STEP_DELAY=0 to disable.
STEP_DELAY="${STEP_DELAY:-1}"

# ============================================================
# Helper functions
# ============================================================

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

step() {
  echo
  echo "==> $*"
  sleep "$STEP_DELAY"
}

resolve_user_home() {
  if command_exists getent; then
    getent passwd "$RUN_USER" | cut -d: -f6
  else
    eval echo "~$RUN_USER"
  fi
}

USER_HOME="$(resolve_user_home)"
USER_HOME="${USER_HOME:-$HOME}"
INSTALL_DIR="${INSTALL_DIR:-$USER_HOME/$APP_NAME}"

validate_template_config() {
  if [[ "$GIT_REPO" == *"YOUR_GITHUB_USERNAME"* ]] || [[ "$GIT_REPO" == *"YOUR_REPOSITORY"* ]]; then
    echo "You must replace the placeholder GIT_REPO before installing."
    echo "Current value: $GIT_REPO"
    exit 1
  fi

  if [[ "$APP_NAME" == "your-app" ]]; then
    echo "Warning: APP_NAME is still set to the placeholder value: your-app"
    echo "You can continue, but you should usually replace it."
    sleep "$STEP_DELAY"
  fi
}

require_systemd() {
  if ! command_exists systemctl; then
    echo "systemd is required but systemctl was not found."
    exit 1
  fi
}

require_repo_checkout() {
  if [ ! -d "$INSTALL_DIR/.git" ]; then
    echo "${APP_TITLE} is not installed in $INSTALL_DIR"
    exit 1
  fi
}

read_env_value() {
  local key="$1"
  local file="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  grep "^${key}=" "$file" | tail -n 1 | cut -d'=' -f2-
}

nodesource_source_exists() {
  as_root grep -Rqs "deb.nodesource.com" /etc/apt/sources.list /etc/apt/sources.list.d 2>/dev/null
}

refresh_nodesource_key_if_possible() {
  if ! nodesource_source_exists; then
    return 0
  fi

  if ! command_exists curl || ! command_exists gpg; then
    return 0
  fi

  step "Refreshing NodeSource signing key..."
  as_root install -d -m 0755 "$(dirname "$NODESOURCE_KEYRING")"
  curl -fsSL "$NODESOURCE_KEY_URL" | as_root gpg --dearmor --yes -o "$NODESOURCE_KEYRING"
  as_root chmod 0644 "$NODESOURCE_KEYRING"
}

apt_update() {
  refresh_nodesource_key_if_possible
  step "Updating apt package lists..."
  as_root apt update
}

# ============================================================
# Repository functions
# ============================================================

ensure_repo_present() {
  validate_template_config

  if [ -d "$INSTALL_DIR/.git" ]; then
    step "Repository already exists. Pulling latest changes..."
    cd "$INSTALL_DIR"
    git pull --ff-only
  elif [ -d "$INSTALL_DIR" ]; then
    step "Directory exists but is not a git repository. Removing and cloning fresh..."
    rm -rf "$INSTALL_DIR"
    git clone "$GIT_REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  else
    step "Cloning repository..."
    git clone "$GIT_REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  fi
}

# ============================================================
# Node.js functions
# ============================================================

configure_nodesource_repo() {
  local arch

  arch="$(dpkg --print-architecture)"

  if [ "$arch" != "amd64" ] && [ "$arch" != "arm64" ]; then
    echo "Unsupported architecture for NodeSource: $arch"
    echo "Only amd64 and arm64 are supported."
    exit 1
  fi

  step "Configuring NodeSource Node.js ${NODESOURCE_NODE_VERSION} repository..."

  as_root install -d -m 0755 "$(dirname "$NODESOURCE_KEYRING")"

  curl -fsSL "$NODESOURCE_KEY_URL" | as_root gpg --dearmor --yes -o "$NODESOURCE_KEYRING"

  as_root chmod 0644 "$NODESOURCE_KEYRING"

  as_root rm -f /etc/apt/sources.list.d/nodesource.list
  as_root rm -f /etc/apt/sources.list.d/nodesource.sources

  as_root tee /etc/apt/sources.list.d/nodesource.sources >/dev/null <<EOF
Types: deb
URIs: https://deb.nodesource.com/node_${NODESOURCE_NODE_VERSION}
Suites: nodistro
Components: main
Architectures: $arch
Signed-By: $NODESOURCE_KEYRING
EOF

  as_root tee /etc/apt/preferences.d/nodejs >/dev/null <<EOF
Package: nodejs
Pin: origin deb.nodesource.com
Pin-Priority: 600
EOF

  as_root tee /etc/apt/preferences.d/nsolid >/dev/null <<EOF
Package: nsolid
Pin: origin deb.nodesource.com
Pin-Priority: 600
EOF

  step "Updating apt after adding NodeSource..."
  as_root apt update
}

install_nodesource_nodejs() {
  configure_nodesource_repo

  step "Installing Node.js..."
  as_root apt install -y nodejs
}

ensure_nodejs() {
  step "Checking Node.js version..."

  if command_exists node; then
    VERSION="$(node -v | sed 's/^v//')"
    MAJOR="${VERSION%%.*}"

    if [ "$MAJOR" -lt 18 ]; then
      echo "Node.js v$VERSION detected, but Node.js >=18 is required."
      read -p "Do you want to install Node.js 22? (y/n): " INSTALL_22

      if [[ "$INSTALL_22" =~ ^[Yy]$ ]]; then
        install_nodesource_nodejs
      else
        echo "Installation requires Node.js >=18. Exiting."
        exit 1
      fi
    else
      echo "Node.js v$VERSION detected. Skipping installation."
    fi
  else
    echo "Node.js not found."
    install_nodesource_nodejs
  fi
}

# ============================================================
# Dependency installation
# ============================================================

install_direct_dependencies() {
  step "Installing system dependencies for direct deployment..."

  apt_update

  as_root apt install -y \
    git \
    curl \
    ca-certificates \
    gnupg \
    build-essential \
    python3 \
    openssl

  ensure_nodejs
}

install_docker_dependencies() {
  step "Installing system dependencies for Docker deployment..."

  apt_update

  as_root apt install -y \
    git \
    curl \
    ca-certificates \
    gnupg \
    openssl

  if ! command_exists docker; then
    step "Installing Docker..."
    as_root apt install -y docker.io
  fi

  if ! docker compose version >/dev/null 2>&1 && ! command_exists docker-compose; then
    step "Installing Docker Compose..."
    as_root apt install -y docker-compose-plugin || as_root apt install -y docker-compose
  fi

  step "Enabling and starting Docker..."
  as_root systemctl enable --now docker
}

ensure_docker_available() {
  if ! command_exists docker; then
    echo "Docker is not installed. Run Docker install first."
    exit 1
  fi

  if ! docker compose version >/dev/null 2>&1 && ! command_exists docker-compose; then
    echo "Docker Compose is not installed. Run Docker install first."
    exit 1
  fi

  as_root systemctl enable --now docker
}

compose() {
  require_repo_checkout

  if docker compose version >/dev/null 2>&1; then
    (
      cd "$INSTALL_DIR"
      as_root docker compose -f "$COMPOSE_FILE" "$@"
    )
    return
  fi

  if command_exists docker-compose; then
    (
      cd "$INSTALL_DIR"
      as_root docker-compose -f "$COMPOSE_FILE" "$@"
    )
    return
  fi

  echo "Docker Compose is required but was not found."
  exit 1
}

# ============================================================
# Environment file functions
# ============================================================

prompt_common_settings() {
  step "Generating application settings..."

  SESSION_PASS="$(openssl rand -base64 32)"
  echo "Session password generated."

  read -p "Port to expose the app on (default 3000): " HOST_PORT
  HOST_PORT="${HOST_PORT:-3000}"
}

write_direct_env_file() {
  step "Writing direct deployment environment file..."

  cat > "${INSTALL_DIR}/${APP_ENV_FILE}" <<EOF
# LinkGuide Environment Configuration

# Session secret for NextAuth (generate a random string)
SESSION_PASSWORD=$SESSION_PASS

# Database location (default: ./data/linkguide.db)
DATABASE_URL=$DIRECT_DATABASE_PATH

# Server port (default: 3000)
PORT=$HOST_PORT
EOF
}

write_docker_env_files() {
  step "Writing Docker deployment environment files..."

  cat > "${INSTALL_DIR}/${APP_ENV_FILE}" <<EOF
# LinkGuide Environment Configuration

# Session secret for NextAuth (generate a random string)
SESSION_PASSWORD=$SESSION_PASS

# Database location (default: ./data/linkguide.db)
DATABASE_URL=$DOCKER_DATABASE_PATH

# Server port (default: 3000)
PORT=$CONTAINER_PORT
EOF

  cat > "${INSTALL_DIR}/${COMPOSE_ENV_FILE}" <<EOF
# Docker Compose environment file

HOST_PORT=$HOST_PORT
EOF
}

# ============================================================
# systemd functions
# ============================================================

write_service_file() {
  local app_port="$1"
  local node_bin

  node_bin="$(command -v node)"

  step "Writing systemd service file..."

  as_root tee "$SERVICE_FILE" >/dev/null <<EOF
[Unit]
Description=${APP_TITLE}
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${RUN_USER}
Group=${RUN_GROUP}
WorkingDirectory=${INSTALL_DIR}
Environment=NODE_ENV=production
EnvironmentFile=${INSTALL_DIR}/${APP_ENV_FILE}
ExecStart=${node_bin} ${INSTALL_DIR}/node_modules/next/dist/bin/next start -p ${app_port}
Restart=always
RestartSec=5
TimeoutStopSec=20
SyslogIdentifier=${APP_NAME}

[Install]
WantedBy=multi-user.target
EOF
}

reload_and_restart_service() {
  step "Reloading systemd and restarting service..."

  as_root systemctl daemon-reload
  as_root systemctl enable "$SERVICE_NAME"
  as_root systemctl restart "$SERVICE_NAME"
}

stop_and_remove_service() {
  if as_root test -f "$SERVICE_FILE"; then
    step "Stopping and removing systemd service..."

    as_root systemctl disable --now "$SERVICE_NAME" || true
    as_root rm -f "$SERVICE_FILE"
    as_root systemctl daemon-reload
  fi
}

# ============================================================
# Direct deployment actions
# ============================================================

install_direct() {
  echo "Starting ${APP_TITLE} direct installation..."

  require_systemd
  install_direct_dependencies
  ensure_repo_present
  prompt_common_settings
  write_direct_env_file

  echo
  echo ".env file created: ${INSTALL_DIR}/${APP_ENV_FILE}"
  echo "Complete setup at: http://localhost:$HOST_PORT/setup"

  step "Installing project dependencies..."
  npm ci

  step "Building the app..."
  npm run build

  write_service_file "$HOST_PORT"
  reload_and_restart_service

  echo
  echo "Installation complete!"
  echo "Visit: http://localhost:$HOST_PORT"
  echo "View logs: sudo journalctl -u $SERVICE_NAME -f"
  echo "Service status: sudo systemctl status $SERVICE_NAME"
}

update_direct() {
  echo "Updating ${APP_TITLE} direct deployment..."

  require_systemd
  require_repo_checkout
  install_direct_dependencies

  cd "$INSTALL_DIR"

  step "Pulling latest code..."
  git pull --ff-only

  step "Installing project dependencies..."
  npm ci

  step "Building the app..."
  npm run build

  APP_PORT="$(read_env_value "PORT" "${INSTALL_DIR}/${APP_ENV_FILE}")"
  APP_PORT="${APP_PORT:-3000}"

  write_service_file "$APP_PORT"
  reload_and_restart_service

  echo
  echo "Update complete!"
  echo "Visit: http://localhost:$APP_PORT"
  echo "View logs: sudo journalctl -u $SERVICE_NAME -f"
}

start_direct() {
  require_systemd

  step "Starting service..."
  as_root systemctl start "$SERVICE_NAME"
  as_root systemctl status "$SERVICE_NAME" --no-pager
}

stop_direct() {
  require_systemd

  step "Stopping service..."
  as_root systemctl stop "$SERVICE_NAME"

  echo "${SERVICE_NAME} stopped."
}

restart_direct() {
  require_systemd

  step "Restarting service..."
  as_root systemctl restart "$SERVICE_NAME"
  as_root systemctl status "$SERVICE_NAME" --no-pager
}

status_direct() {
  require_systemd

  step "Checking service status..."
  as_root systemctl status "$SERVICE_NAME" --no-pager
}

logs_direct() {
  require_systemd

  step "Opening service logs..."
  as_root journalctl -u "$SERVICE_NAME" -f
}

uninstall_direct() {
  echo "Uninstalling ${APP_TITLE} direct deployment..."

  require_systemd
  stop_and_remove_service

  if [ -d "$INSTALL_DIR" ]; then
    step "Removing installation directory..."
    rm -rf "$INSTALL_DIR"
    echo "Removed $INSTALL_DIR"
  fi

  echo
  echo "Uninstall complete!"
  echo "Note: System dependencies were not removed."
}

# ============================================================
# Docker deployment actions
# ============================================================

install_docker_mode() {
  echo "Starting ${APP_TITLE} Docker installation..."

  install_docker_dependencies
  ensure_repo_present
  prompt_common_settings
  write_docker_env_files

  echo
  echo ".env files created:"
  echo "- ${INSTALL_DIR}/${APP_ENV_FILE}"
  echo "- ${INSTALL_DIR}/${COMPOSE_ENV_FILE}"
  echo "Complete setup at: http://localhost:$HOST_PORT/setup"

  step "Creating data directory..."
  mkdir -p "${INSTALL_DIR}/data"

  step "Building and starting Docker services..."
  compose up -d --build

  echo
  echo "Installation complete!"
  echo "Visit: http://localhost:$HOST_PORT"
  echo "View logs: sudo docker compose logs -f"
  echo "Container status: sudo docker compose ps"
}

update_docker_mode() {
  echo "Updating ${APP_TITLE} Docker deployment..."

  require_repo_checkout
  install_docker_dependencies

  cd "$INSTALL_DIR"

  step "Pulling latest code..."
  git pull --ff-only

  step "Rebuilding and restarting Docker services..."
  compose up -d --build

  HOST_PORT_VALUE="$(read_env_value "HOST_PORT" "${INSTALL_DIR}/${COMPOSE_ENV_FILE}")"
  HOST_PORT_VALUE="${HOST_PORT_VALUE:-3000}"

  echo
  echo "Update complete!"
  echo "Visit: http://localhost:$HOST_PORT_VALUE"
  echo "View logs: sudo docker compose logs -f"
}

start_docker_mode() {
  ensure_docker_available

  step "Starting Docker containers..."
  compose up -d
  compose ps
}

stop_docker_mode() {
  ensure_docker_available

  step "Stopping Docker containers..."
  compose stop
}

restart_docker_mode() {
  ensure_docker_available

  step "Restarting Docker containers..."
  compose restart
  compose ps
}

status_docker_mode() {
  ensure_docker_available

  step "Checking Docker container status..."
  compose ps
}

logs_docker_mode() {
  ensure_docker_available

  step "Opening Docker logs..."
  compose logs -f
}

uninstall_docker_mode() {
  echo "Uninstalling ${APP_TITLE} Docker deployment..."

  if [ -d "$INSTALL_DIR" ]; then
    if command_exists docker && { docker compose version >/dev/null 2>&1 || command_exists docker-compose; }; then
      step "Stopping and removing Docker containers..."
      compose down --remove-orphans || true
    fi

    step "Removing installation directory..."
    rm -rf "$INSTALL_DIR"

    echo "Removed $INSTALL_DIR"
  fi

  echo
  echo "Uninstall complete!"
  echo "Note: System dependencies were not removed."
}

# ============================================================
# Menus
# ============================================================

show_direct_menu() {
  echo
  echo "====== Direct Deployment (systemd) ======"
  echo "1) Install"
  echo "2) Update"
  echo "3) Start service"
  echo "4) Stop service"
  echo "5) Restart service"
  echo "6) Service status"
  echo "7) Service logs"
  echo "8) Uninstall"
  echo "========================================="
  read -p "Select an option [1-8]: " CHOICE

  case "$CHOICE" in
    1) install_direct ;;
    2) update_direct ;;
    3) start_direct ;;
    4) stop_direct ;;
    5) restart_direct ;;
    6) status_direct ;;
    7) logs_direct ;;
    8) uninstall_direct ;;
    *) echo "Invalid choice. Exiting."; exit 1 ;;
  esac
}

show_docker_menu() {
  echo
  echo "====== Docker Deployment (Compose) ======"
  echo "1) Install"
  echo "2) Update"
  echo "3) Start containers"
  echo "4) Stop containers"
  echo "5) Restart containers"
  echo "6) Container status"
  echo "7) Container logs"
  echo "8) Uninstall"
  echo "========================================="
  read -p "Select an option [1-8]: " CHOICE

  case "$CHOICE" in
    1) install_docker_mode ;;
    2) update_docker_mode ;;
    3) start_docker_mode ;;
    4) stop_docker_mode ;;
    5) restart_docker_mode ;;
    6) status_docker_mode ;;
    7) logs_docker_mode ;;
    8) uninstall_docker_mode ;;
    *) echo "Invalid choice. Exiting."; exit 1 ;;
  esac
}

show_deployment_menu() {
  echo
  echo "========== ${APP_TITLE} Installer =========="
  echo "1) Direct install (systemd)"
  echo "2) Docker install (Compose)"
  echo "============================================"
  read -p "Select a deployment mode [1-2]: " MODE_CHOICE

  case "$MODE_CHOICE" in
    1) show_direct_menu ;;
    2) show_docker_menu ;;
    *) echo "Invalid choice. Exiting."; exit 1 ;;
  esac
}

show_deployment_menu