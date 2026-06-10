#!/bin/sh
set -eu

db_path="${DATABASE_URL:-/app/data/link-guide.sqlite}"

case "$db_path" in
  file:*)
    db_path="${db_path#file:}"
    ;;
esac

db_dir=""
case "$db_path" in
  ""|":memory:")
    ;;
  */*)
    db_dir="$(dirname "$db_path")"
    ;;
esac

mkdir -p /app/data
if [ -n "$db_dir" ] && [ "$db_dir" != "." ]; then
  mkdir -p "$db_dir"
fi

if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs /app/data
  if [ -n "$db_dir" ] && [ "$db_dir" != "." ] && [ "$db_dir" != "/app/data" ]; then
    chown -R nextjs:nodejs "$db_dir"
  fi

  exec gosu nextjs "$@"
fi

exec "$@"
