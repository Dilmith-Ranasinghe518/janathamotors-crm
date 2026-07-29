FROM php:8.4-cli-alpine

# Install system dependencies & PHP extensions
RUN apk add --no-cache \
    curl \
    git \
    libpng-dev \
    libzip-dev \
    zip \
    unzip \
    icu-dev \
    oniguruma-dev \
    freetype-dev \
    libjpeg-turbo-dev

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql gd zip bcmath intl mbstring

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy application files
COPY . .

# Install dependencies & optimize (ignoring platform req check for PHP minor mismatches)
RUN composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-req=php+

# Set permissions for storage & bootstrap/cache
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 8080

CMD ["sh", "-c", "php artisan config:clear && (php artisan migrate --force || echo 'Migration failed - check DB credentials') && php artisan serve --host=0.0.0.0 --port=8080"]
