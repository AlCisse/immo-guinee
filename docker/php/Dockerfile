# ==============================================
# Dockerfile pour Docker Compose (local dev)
# Laravel 11 Backend - PHP 8.3-fpm
# ==============================================

FROM php:8.3-fpm

# Set working directory
WORKDIR /var/www/backend

# Install system dependencies (Debian packages)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libpq-dev \
    libzip-dev \
    zip \
    unzip \
    imagemagick \
    libmagickwand-dev \
    libicu-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    jpegoptim \
    optipng \
    pngquant \
    gifsicle \
    webp \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pdo \
    pdo_pgsql \
    pgsql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    intl \
    opcache

# Install Redis extension
RUN pecl install redis \
    && docker-php-ext-enable redis

# Install Imagick extension
RUN pecl install imagick \
    && docker-php-ext-enable imagick

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy backend application directory
COPY backend /var/www/backend

# Install Composer dependencies
RUN composer install --optimize-autoloader --no-interaction --ignore-platform-reqs --no-scripts

# Create necessary directories (only if not exists)
RUN mkdir -p /var/www/backend/storage/framework/{sessions,views,cache} \
    && mkdir -p /var/www/backend/storage/logs \
    && mkdir -p /var/www/backend/bootstrap/cache

# Set permissions
RUN chown -R www-data:www-data /var/www/backend \
    && chmod -R 755 /var/www/backend

# Expose port 9000 and start php-fpm server
EXPOSE 9000
CMD ["php-fpm"]
