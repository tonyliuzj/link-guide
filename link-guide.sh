#!/bin/bash

set -euo pipefail

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

resolve_user_home() {
  if command_exists getent; then
    getent passwd "$RUN_USER" | cut -d: -f6
  else
    eval echo "~$RUN_USER"
  fi
}

APP_NAME="link-guide"
APP_TITLE="Link Guide"
RUN_USER="${SUDO_USER:-$USER}"
RUN_GROUP="$(id -gn "$RUN_USER")"
USER_HOME="$(resolve_user_home)"
USER_HOME="${USER_HOME:-$HOME}"
GIT_REPO="${LINK_GUIDE_GIT_REPO:-https://github.com/tonyliuzj/link-guide.git}"
INSTALL_DIR="${LINK_GUIDE_INSTALL_DIR:-$USER_HOME/link-guide}"
APP_ENV_FILE=".env.local"
COMPOSE_ENV_FILE=".env"
COMPOSE_FILE="docker-compose.yml"
DIRECT_DATABASE_PATH="data/link-guide.sqlite"
DOCKER_DATABASE_PATH="/app/data/link-guide.sqlite"
CONTAINER_PORT="3000"
SERVICE_NAME="${APP_NAME}.service"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}"

require_systemd() {
  if ! command_exists systemctl; then
    echo "systemd is required but systemctl was not found."
    exit 1
  fi
}

ensure_repo_present() {
  if [ -d "$INSTALL_DIR/.git" ]; then
    echo "Repository already exists. Pulling latest changes..."
    cd "$INSTALL_DIR"
    git pull --ff-only
  elif [ -d "$INSTALL_DIR" ]; then
    echo "Directory exists but is not a git repository. Removing and cloning fresh..."
    rm -rf "$INSTALL_DIR"
    git clone "$GIT_REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  else
    git clone "$GIT_REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
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

ensure_nodejs() {
  echo "Checking Node.js version..."
  if command_exists node; then
    VERSION=$(node -v | sed 's/^v//')
    MAJOR=${VERSION%%.*}
    if [ "$MAJOR" -lt 18 ]; then
      echo "Node.js v$VERSION detected (<18)."
      read -p "Do you want to install Node.js 22? (y/n): " INSTALL_22
      if [[ "$INSTALL_22" =~ ^[Yy]$ ]]; then
        echo "Installing Node.js 22..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
        sudo apt install -y nodejs
      else
        echo "Installation requires Node.js >=18. Exiting."
        exit 1
      fi
    else
      echo "Node.js v$VERSION detected. Skipping installation."
    fi
  else
    echo "Node.js not found. Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
  fi
}

install_direct_dependencies() {
  echo "Installing system dependencies for direct deployment..."
  sudo apt update
  sudo apt install -y git curl build-essential python3 openssl
  ensure_nodejs
}

install_docker_dependencies() {
  echo "Installing system dependencies for Docker deployment..."
  sudo apt update
  sudo apt install -y git curl ca-certificates openssl

  if ! command_exists docker; then
    echo "Installing Docker..."
    sudo apt install -y docker.io
  fi

  if ! docker compose version >/dev/null 2>&1 && ! command_exists docker-compose; then
    echo "Installing Docker Compose..."
    sudo apt install -y docker-compose-plugin || sudo apt install -y docker-compose
  fi

  sudo systemctl enable --now docker
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

  sudo systemctl enable --now docker
}

compose() {
  require_repo_checkout

  if docker compose version >/dev/null 2>&1; then
    (
      cd "$INSTALL_DIR"
      sudo docker compose "$@"
    )
    return
  fi

  if command_exists docker-compose; then
    (
      cd "$INSTALL_DIR"
      sudo docker-compose "$@"
    )
    return
  fi

  echo "Docker Compose is required but was not found."
  exit 1
}

write_service_file() {
  local app_port="$1"
  local node_bin
  node_bin="$(command -v node)"

  sudo tee "$SERVICE_FILE" >/dev/null <<EOF
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
  sudo systemctl daemon-reload
  sudo systemctl enable "$SERVICE_NAME"
  sudo systemctl restart "$SERVICE_NAME"
}

stop_and_remove_service() {
  if sudo test -f "$SERVICE_FILE"; then
    sudo systemctl disable --now "$SERVICE_NAME" || true
    sudo rm -f "$SERVICE_FILE"
    sudo systemctl daemon-reload
  fi
}

prompt_common_settings() {
  SESSION_PASS=$(openssl rand -base64 48 | tr -d '\n' | head -c 32)
  echo "Session password generated"

  read -p "Port to expose the app on (default 3000): " HOST_PORT
  HOST_PORT=${HOST_PORT:-3000}

  read -p "Primary host/domain for short links (default localhost:${HOST_PORT}): " PRIMARY_DOMAIN
  PRIMARY_DOMAIN=${PRIMARY_DOMAIN:-localhost:${HOST_PORT}}

  read -p "Additional domains, comma-separated (optional): " EXTRA_DOMAINS

  DOMAINS="$PRIMARY_DOMAIN"
  if [ -n "${EXTRA_DOMAINS// }" ]; then
    DOMAINS="${PRIMARY_DOMAIN},${EXTRA_DOMAINS}"
  fi
}

write_direct_env_file() {
  cat > "${INSTALL_DIR}/${APP_ENV_FILE}" <<EOF
SESSION_PASSWORD=$SESSION_PASS
PORT=$HOST_PORT
DATABASE_PATH=$DIRECT_DATABASE_PATH
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
DOMAINS=$DOMAINS
PRIMARY_DOMAIN=$PRIMARY_DOMAIN
TURNSTILE_ENABLED=false
EOF
}

write_docker_env_files() {
  cat > "${INSTALL_DIR}/${APP_ENV_FILE}" <<EOF
SESSION_PASSWORD=$SESSION_PASS
PORT=$CONTAINER_PORT
DATABASE_PATH=$DOCKER_DATABASE_PATH
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
DOMAINS=$DOMAINS
PRIMARY_DOMAIN=$PRIMARY_DOMAIN
TURNSTILE_ENABLED=false
EOF

  cat > "${INSTALL_DIR}/${COMPOSE_ENV_FILE}" <<EOF
HOST_PORT=$HOST_PORT
EOF
}

install_direct() {
  echo "Starting ${APP_TITLE} direct installation..."
  require_systemd
  install_direct_dependencies
  ensure_repo_present
  prompt_common_settings
  write_direct_env_file

  echo ".env.local created"
  echo "Default admin login: admin / changeme"
  echo "Change the password after first login at /admin/settings"

  echo "Installing project dependencies..."
  npm ci

  echo "Building the app..."
  npm run build

  echo "Installing ${APP_TITLE} systemd service..."
  write_service_file "$HOST_PORT"
  reload_and_restart_service

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
  git pull --ff-only
  npm ci
  npm run build

  APP_PORT=$(read_env_value "PORT" "${INSTALL_DIR}/${APP_ENV_FILE}")
  APP_PORT=${APP_PORT:-3000}

  write_service_file "$APP_PORT"
  reload_and_restart_service

  echo "Update complete!"
  echo "Visit: http://localhost:$APP_PORT"
  echo "View logs: sudo journalctl -u $SERVICE_NAME -f"
}

start_direct() {
  require_systemd
  sudo systemctl start "$SERVICE_NAME"
  sudo systemctl status "$SERVICE_NAME" --no-pager
}

stop_direct() {
  require_systemd
  sudo systemctl stop "$SERVICE_NAME"
  echo "${SERVICE_NAME} stopped."
}

restart_direct() {
  require_systemd
  sudo systemctl restart "$SERVICE_NAME"
  sudo systemctl status "$SERVICE_NAME" --no-pager
}

status_direct() {
  require_systemd
  sudo systemctl status "$SERVICE_NAME" --no-pager
}

logs_direct() {
  require_systemd
  sudo journalctl -u "$SERVICE_NAME" -f
}

uninstall_direct() {
  echo "Uninstalling ${APP_TITLE} direct deployment..."
  require_systemd
  stop_and_remove_service

  if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    echo "Removed $INSTALL_DIR"
  fi

  echo "Uninstall complete!"
  echo "Note: System dependencies (Node.js, systemd) were not removed."
}

install_docker_mode() {
  echo "Starting ${APP_TITLE} Docker installation..."
  install_docker_dependencies
  ensure_repo_present
  prompt_common_settings
  write_docker_env_files

  echo ".env.local and .env created"
  echo "Default admin login: admin / changeme"
  echo "Change the password after first login at /admin/settings"

  mkdir -p "${INSTALL_DIR}/data"

  echo "Building and starting Docker services..."
  compose up -d --build

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
  git pull --ff-only

  echo "Rebuilding and restarting Docker services..."
  compose up -d --build

  HOST_PORT_VALUE=$(read_env_value "HOST_PORT" "${INSTALL_DIR}/${COMPOSE_ENV_FILE}")
  HOST_PORT_VALUE=${HOST_PORT_VALUE:-3000}

  echo "Update complete!"
  echo "Visit: http://localhost:$HOST_PORT_VALUE"
  echo "View logs: sudo docker compose logs -f"
}

start_docker_mode() {
  ensure_docker_available
  compose up -d
  compose ps
}

stop_docker_mode() {
  ensure_docker_available
  compose stop
}

restart_docker_mode() {
  ensure_docker_available
  compose restart
  compose ps
}

status_docker_mode() {
  ensure_docker_available
  compose ps
}

logs_docker_mode() {
  ensure_docker_available
  compose logs -f
}

uninstall_docker_mode() {
  echo "Uninstalling ${APP_TITLE} Docker deployment..."

  if [ -d "$INSTALL_DIR" ]; then
    if command_exists docker && { docker compose version >/dev/null 2>&1 || command_exists docker-compose; }; then
      compose down --remove-orphans || true
    fi
    rm -rf "$INSTALL_DIR"
    echo "Removed $INSTALL_DIR"
  fi

  echo "Uninstall complete!"
  echo "Note: System dependencies (Docker, systemd) were not removed."
}

show_direct_menu() {
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

  case $CHOICE in
    1) install_direct ;;
    2) update_direct ;;
    3) start_direct ;;
    4) stop_direct ;;
    5) restart_direct ;;
    6) status_direct ;;
    7) logs_direct ;;
    8) uninstall_direct ;;
    *) echo "Invalid choice. Exiting." ; exit 1 ;;
  esac
}

show_docker_menu() {
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

  case $CHOICE in
    1) install_docker_mode ;;
    2) update_docker_mode ;;
    3) start_docker_mode ;;
    4) stop_docker_mode ;;
    5) restart_docker_mode ;;
    6) status_docker_mode ;;
    7) logs_docker_mode ;;
    8) uninstall_docker_mode ;;
    *) echo "Invalid choice. Exiting." ; exit 1 ;;
  esac
}

show_deployment_menu() {
  echo "========== ${APP_TITLE} Installer =========="
  echo "1) Direct install (systemd)"
  echo "2) Docker install (Compose)"
  echo "============================================"
  read -p "Select a deployment mode [1-2]: " MODE_CHOICE

  case $MODE_CHOICE in
    1) show_direct_menu ;;
    2) show_docker_menu ;;
    *) echo "Invalid choice. Exiting." ; exit 1 ;;
  esac
}

show_deployment_menu
