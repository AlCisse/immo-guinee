#!/bin/sh
# WAHA Session Auto-Start Script
# Waits for WAHA to be ready and starts the default session

set -e

WAHA_URL="${WAHA_URL:-http://localhost:3000}"
API_KEY="${WAHA_API_KEY}"
MAX_RETRIES=30
RETRY_DELAY=2

echo "[waha-session] Waiting for WAHA API to be ready..."

# Wait for WAHA to be ready
for i in $(seq 1 $MAX_RETRIES); do
    if curl -s -o /dev/null -w "%{http_code}" "${WAHA_URL}/api/health" 2>/dev/null | grep -q "200\|401"; then
        echo "[waha-session] WAHA API is ready"
        break
    fi

    if [ $i -eq $MAX_RETRIES ]; then
        echo "[waha-session] WAHA API not ready after ${MAX_RETRIES} retries, exiting"
        exit 1
    fi

    echo "[waha-session] Waiting for WAHA API... (attempt $i/$MAX_RETRIES)"
    sleep $RETRY_DELAY
done

# Check if session already exists
echo "[waha-session] Checking for existing sessions..."
SESSIONS=$(curl -s -X GET "${WAHA_URL}/api/sessions" \
    -H "X-Api-Key: ${API_KEY}" \
    -H "Content-Type: application/json")

if echo "$SESSIONS" | grep -q '"name":"default"'; then
    echo "[waha-session] Session 'default' already exists"

    # Check session status
    STATUS=$(curl -s -X GET "${WAHA_URL}/api/sessions/default" \
        -H "X-Api-Key: ${API_KEY}" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

    echo "[waha-session] Session status: $STATUS"

    if [ "$STATUS" = "STOPPED" ] || [ "$STATUS" = "FAILED" ]; then
        echo "[waha-session] Restarting stopped session..."
        curl -s -X POST "${WAHA_URL}/api/sessions/default/restart" \
            -H "X-Api-Key: ${API_KEY}" \
            -H "Content-Type: application/json"
        echo "[waha-session] Session restart requested"
    fi
else
    echo "[waha-session] Creating new session 'default'..."

    RESULT=$(curl -s -X POST "${WAHA_URL}/api/sessions/start" \
        -H "X-Api-Key: ${API_KEY}" \
        -H "Content-Type: application/json" \
        -d '{"name": "default"}')

    echo "[waha-session] Session creation result: $RESULT"
fi

echo "[waha-session] Done"
