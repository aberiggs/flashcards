#!/bin/sh
set -e

# Run DB migrations, then start the app. Migrations are idempotent —
# drizzle-kit skips already-applied ones via the __drizzle_migrations table.
echo "Running database migrations..."
cd /app
NODE_PATH=/app/migrate/node_modules /app/migrate/node_modules/.bin/drizzle-kit migrate

echo "Starting app..."
exec node server.js