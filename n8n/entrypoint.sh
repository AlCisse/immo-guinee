#!/bin/sh
# n8n entrypoint - Load secrets as environment variables
# Secrets are read from /run/secrets/ and exported for use with $env() in workflows

# Function to read secret and export as env var
load_secret() {
    secret_name=$1
    env_name=$2
    secret_file="/run/secrets/${secret_name}"

    if [ -f "$secret_file" ]; then
        export "$env_name"="$(cat "$secret_file")"
        echo "Loaded secret: $env_name"
    fi
}

# Load n8n authentication from secret
load_secret "n8n_password" "N8N_BASIC_AUTH_PASSWORD"

# Load all n8n workflow secrets
load_secret "n8n_api_service_token" "API_SERVICE_TOKEN"
load_secret "n8n_fcm_server_key" "FCM_SERVER_KEY"
load_secret "n8n_sms_api_key" "SMS_API_KEY"
load_secret "n8n_twilio_account_sid" "TWILIO_ACCOUNT_SID"
load_secret "n8n_twilio_auth_token" "TWILIO_AUTH_TOKEN"
load_secret "n8n_twilio_phone_number" "TWILIO_PHONE_NUMBER"
load_secret "waha_api_key" "WAHA_API_KEY"

# AI & Messaging secrets
load_secret "n8n_openai_api_key" "OPENAI_API_KEY"
load_secret "n8n_telegram_bot_token" "TELEGRAM_BOT_TOKEN"
load_secret "n8n_telegram_chat_id" "TELEGRAM_CHAT_ID"

# Email/SMTP secrets
load_secret "n8n_smtp_host" "SMTP_HOST"
load_secret "n8n_smtp_user" "SMTP_USER"
load_secret "n8n_smtp_password" "SMTP_PASSWORD"

# URLs are set via environment variables in docker-compose
# These are just defaults if not set
export IMMOGUINEE_API_URL="${IMMOGUINEE_API_URL:-https://immoguinee.com}"
export LARAVEL_API_URL="${LARAVEL_API_URL:-https://immoguinee.com}"
export FRONTEND_URL="${FRONTEND_URL:-https://immoguinee.com}"
export N8N_WEBHOOK_URL="${N8N_WEBHOOK_URL:-https://automate.immoguinee.com}"
export WAHA_URL="${WAHA_URL:-http://waha:3000}"
export WAHA_API_URL="${WAHA_API_URL:-http://waha:3000}"
export SMS_GATEWAY_URL="${SMS_GATEWAY_URL:-https://api.orange.gn/sms/v1}"
export TWILIO_API_URL="${TWILIO_API_URL:-https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}}"

echo "n8n environment configured with secrets"

# Execute the original n8n entrypoint
exec /docker-entrypoint.sh "$@"
