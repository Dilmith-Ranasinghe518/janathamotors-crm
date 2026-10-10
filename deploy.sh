#!/usr/bin/env bash
set -e

echo "=== Janatha Motors CRM — Hostinger Deployment Script ==="

# Detect script directory (repository root)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR/backend"

# Ensure .env exists
if [ ! -f .env ]; then
    echo "Notice: .env not found in backend/. Copying .env.example..."
    cp .env.example .env
    echo "Please remember to update database credentials in backend/.env!"
fi

echo "Step 1: Installing Composer dependencies (no-dev, optimized)..."
composer install --no-dev --optimize-autoloader --no-interaction

echo "Step 2: Checking application key..."
if ! grep -q "^APP_KEY=base64:" .env 2>/dev/null; then
    php artisan key:generate --force
fi

echo "Step 3: Running database migrations..."
php artisan migrate --force

echo "Step 4: Ensuring storage link exists..."
php artisan storage:link || true

echo "Step 5: Optimizing caches (config, routes, views)..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "=== Deployment Finished Successfully! ==="
