#!/bin/sh
# FFmpeg API entrypoint - Load secrets as environment variables

# Load API key from Docker secret
SECRET_FILE="/run/secrets/ffmpeg_api_key"
if [ -f "$SECRET_FILE" ]; then
    export FFMPEG_API_KEY="$(cat "$SECRET_FILE")"
    echo "Loaded FFMPEG_API_KEY from Docker secret"
fi

if [ -z "$FFMPEG_API_KEY" ]; then
    echo "WARNING: FFMPEG_API_KEY not set. API will reject all requests."
fi

exec "$@"
