# ==============================================
# Dockerfile pour déploiement CapRover
# Laravel 11 Backend - PHP 8.3-fpm
# ==============================================

FROM php:8.3-fpm-alpine AS base

# Install system dependencies (Alpine packages)
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    oniguruma-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    icu-dev \
    postgresql-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    imagemagick-dev \
    imagemagick \
    jpegoptim \
    optipng \
    pngquant \
    gifsicle \
    libwebp-tools \
    bash

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pdo \
    pdo_pgsql \
    pgsql \
    bcmath \
    mbstring \
    exif \
    pcntl \
    gd \
    zip \
    intl \
    opcache

# Install Redis and Imagick extensions via PECL
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis imagick \
    && docker-php-ext-enable redis imagick \
    && apk del .build-deps

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/backend

# Copy composer files first (for better layer caching)
COPY backend/composer.json backend/composer.lock ./

# Create bootstrap/cache directory BEFORE composer install
RUN mkdir -p bootstrap/cache && chmod -R 775 bootstrap/cache

# Install dependencies (production)
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

# Copy application code
COPY backend/ .

# Run post-install scripts (bootstrap/cache must exist)
RUN mkdir -p bootstrap/cache && chmod -R 775 bootstrap/cache \
    && composer run-script post-autoload-dump

# Copy custom PHP configuration
COPY docker/php/php.ini /usr/local/etc/php/php.ini

# Create necessary directories and set permissions
RUN mkdir -p storage/framework/{sessions,views,cache} \
    && mkdir -p storage/logs \
    && mkdir -p bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 755 storage bootstrap/cache

# Expose PHP-FPM port
EXPOSE 9000

CMD ["php-fpm"]