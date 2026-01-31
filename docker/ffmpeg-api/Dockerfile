# ===============================================
# FFmpeg REST API - Alpine + FastAPI
# Internal service for media processing (n8n)
# ===============================================

FROM python:3.12-alpine

# Install ffmpeg, ffprobe, mediainfo
RUN apk add --no-cache \
    ffmpeg \
    mediainfo \
    wget \
    font-dejavu \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -S ffmpeg && adduser -S ffmpeg -G ffmpeg

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create data directory
RUN mkdir -p /data && chown ffmpeg:ffmpeg /data

USER ffmpeg

EXPOSE 3500

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
    CMD wget -q -O /dev/null http://localhost:3500/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3500", "--workers", "2"]
