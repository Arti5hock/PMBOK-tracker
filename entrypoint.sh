#!/bin/sh
set -e

echo "Ожидание готовности PostgreSQL..."
while ! python -c "import socket; s = socket.socket(); s.connect(('db', 5432)); s.close()" 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL доступен!"

python manage.py migrate --noinput
python manage.py collectstatic --noinput 2>/dev/null || true

exec "$@"