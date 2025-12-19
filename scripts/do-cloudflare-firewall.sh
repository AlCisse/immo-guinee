#!/bin/bash
# =============================================================================
# DigitalOcean Cloud Firewall - Cloudflare Only
# Uses DO API to create/update firewall rules
# =============================================================================
# Requirements:
#   - doctl CLI installed and authenticated
#   - OR: DO_API_TOKEN environment variable set
# =============================================================================

set -e

# Configuration
FIREWALL_NAME="immog-cloudflare-only"
DROPLET_TAG="immog-production"  # Tag applied to your droplets

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Fetch Cloudflare IPs
fetch_cloudflare_ips() {
    log "Fetching Cloudflare IP ranges..."

    CF_IPV4=$(curl -s https://www.cloudflare.com/ips-v4 | tr '\n' ',' | sed 's/,$//')
    CF_IPV6=$(curl -s https://www.cloudflare.com/ips-v6 | tr '\n' ',' | sed 's/,$//')

    echo "IPv4: $(echo "$CF_IPV4" | tr ',' '\n' | wc -l) ranges"
    echo "IPv6: $(echo "$CF_IPV6" | tr ',' '\n' | wc -l) ranges"
}

# Create firewall using doctl
create_firewall_doctl() {
    log "Creating/Updating firewall via doctl..."

    fetch_cloudflare_ips

    # Build inbound rules JSON
    # Format: protocol:ports:address
    INBOUND_RULES=""

    # SSH from anywhere (or restrict to your IP)
    INBOUND_RULES+="protocol:tcp,ports:22,address:0.0.0.0/0,address:::/0 "

    # HTTP/HTTPS from Cloudflare IPv4
    for ip in $(echo "$CF_IPV4" | tr ',' ' '); do
        INBOUND_RULES+="protocol:tcp,ports:80,address:$ip "
        INBOUND_RULES+="protocol:tcp,ports:443,address:$ip "
    done

    # HTTP/HTTPS from Cloudflare IPv6
    for ip in $(echo "$CF_IPV6" | tr ',' ' '); do
        INBOUND_RULES+="protocol:tcp,ports:80,address:$ip "
        INBOUND_RULES+="protocol:tcp,ports:443,address:$ip "
    done

    # Check if firewall exists
    EXISTING_FW=$(doctl compute firewall list --format ID,Name --no-header | grep "$FIREWALL_NAME" | awk '{print $1}' || true)

    if [ -n "$EXISTING_FW" ]; then
        log "Updating existing firewall: $EXISTING_FW"
        doctl compute firewall update "$EXISTING_FW" \
            --name "$FIREWALL_NAME" \
            --inbound-rules "$INBOUND_RULES" \
            --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0,address:::/0 protocol:udp,ports:all,address:0.0.0.0/0,address:::/0 protocol:icmp,address:0.0.0.0/0,address:::/0" \
            --tag-names "$DROPLET_TAG"
    else
        log "Creating new firewall..."
        doctl compute firewall create \
            --name "$FIREWALL_NAME" \
            --inbound-rules "$INBOUND_RULES" \
            --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0,address:::/0 protocol:udp,ports:all,address:0.0.0.0/0,address:::/0 protocol:icmp,address:0.0.0.0/0,address:::/0" \
            --tag-names "$DROPLET_TAG"
    fi

    log "Firewall configured successfully!"
}

# Create firewall using API directly (if doctl not available)
create_firewall_api() {
    if [ -z "$DO_API_TOKEN" ]; then
        error "DO_API_TOKEN environment variable not set"
        exit 1
    fi

    log "Creating firewall via API..."

    fetch_cloudflare_ips

    # Build inbound rules array
    INBOUND_JSON='['

    # SSH
    INBOUND_JSON+='{"protocol":"tcp","ports":"22","sources":{"addresses":["0.0.0.0/0","::/0"]}},'

    # Cloudflare IPs for HTTP/HTTPS
    CF_ADDRESSES=""
    for ip in $(echo "$CF_IPV4" | tr ',' ' '); do
        CF_ADDRESSES+="\"$ip\","
    done
    for ip in $(echo "$CF_IPV6" | tr ',' ' '); do
        CF_ADDRESSES+="\"$ip\","
    done
    CF_ADDRESSES=${CF_ADDRESSES%,}  # Remove trailing comma

    INBOUND_JSON+="{\"protocol\":\"tcp\",\"ports\":\"80\",\"sources\":{\"addresses\":[$CF_ADDRESSES]}},"
    INBOUND_JSON+="{\"protocol\":\"tcp\",\"ports\":\"443\",\"sources\":{\"addresses\":[$CF_ADDRESSES]}}"
    INBOUND_JSON+=']'

    # Outbound rules (allow all)
    OUTBOUND_JSON='[
        {"protocol":"tcp","ports":"all","destinations":{"addresses":["0.0.0.0/0","::/0"]}},
        {"protocol":"udp","ports":"all","destinations":{"addresses":["0.0.0.0/0","::/0"]}},
        {"protocol":"icmp","destinations":{"addresses":["0.0.0.0/0","::/0"]}}
    ]'

    # Create firewall
    PAYLOAD=$(cat <<EOF
{
    "name": "$FIREWALL_NAME",
    "inbound_rules": $INBOUND_JSON,
    "outbound_rules": $OUTBOUND_JSON,
    "droplet_ids": [],
    "tags": ["$DROPLET_TAG"]
}
EOF
)

    # Check if firewall exists
    EXISTING=$(curl -s -X GET \
        -H "Authorization: Bearer $DO_API_TOKEN" \
        "https://api.digitalocean.com/v2/firewalls" | \
        jq -r ".firewalls[] | select(.name==\"$FIREWALL_NAME\") | .id")

    if [ -n "$EXISTING" ] && [ "$EXISTING" != "null" ]; then
        log "Updating existing firewall: $EXISTING"
        curl -s -X PUT \
            -H "Authorization: Bearer $DO_API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD" \
            "https://api.digitalocean.com/v2/firewalls/$EXISTING" | jq .
    else
        log "Creating new firewall..."
        curl -s -X POST \
            -H "Authorization: Bearer $DO_API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD" \
            "https://api.digitalocean.com/v2/firewalls" | jq .
    fi

    log "Firewall configured successfully!"
}

# Show current Cloudflare IPs
show_cloudflare_ips() {
    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}     Current Cloudflare IP Ranges${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    echo "IPv4 Ranges:"
    curl -s https://www.cloudflare.com/ips-v4
    echo ""
    echo "IPv6 Ranges:"
    curl -s https://www.cloudflare.com/ips-v6
    echo ""
}

# Print manual instructions for DO Dashboard
print_manual_instructions() {
    fetch_cloudflare_ips

    echo ""
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}  Manual Setup via DigitalOcean Dashboard${NC}"
    echo -e "${BLUE}=========================================${NC}"
    echo ""
    echo "1. Go to: https://cloud.digitalocean.com/networking/firewalls"
    echo "2. Click 'Create Firewall'"
    echo "3. Name: $FIREWALL_NAME"
    echo ""
    echo "4. Inbound Rules:"
    echo "   - SSH (22): All IPv4, All IPv6"
    echo "   - HTTP (80): Add these Cloudflare IPs:"
    echo ""
    echo "   IPv4:"
    curl -s https://www.cloudflare.com/ips-v4 | while read ip; do
        echo "     $ip"
    done
    echo ""
    echo "   IPv6:"
    curl -s https://www.cloudflare.com/ips-v6 | while read ip; do
        echo "     $ip"
    done
    echo ""
    echo "   - HTTPS (443): Same Cloudflare IPs as HTTP"
    echo ""
    echo "5. Outbound Rules: Allow all"
    echo "6. Apply to Droplets: Select your server or use tag '$DROPLET_TAG'"
    echo ""
}

# Main
case "${1:-}" in
    doctl)
        create_firewall_doctl
        ;;
    api)
        create_firewall_api
        ;;
    ips)
        show_cloudflare_ips
        ;;
    manual)
        print_manual_instructions
        ;;
    *)
        echo "DigitalOcean Cloudflare-Only Firewall Setup"
        echo ""
        echo "Usage: $0 {doctl|api|ips|manual}"
        echo ""
        echo "Commands:"
        echo "  doctl  - Create/update firewall using doctl CLI"
        echo "  api    - Create/update firewall using DO API (needs DO_API_TOKEN)"
        echo "  ips    - Show current Cloudflare IP ranges"
        echo "  manual - Print manual setup instructions for DO Dashboard"
        echo ""
        exit 1
        ;;
esac
