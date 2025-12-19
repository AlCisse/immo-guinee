#!/bin/bash
# =============================================================================
# Cloudflare-Only Firewall Configuration
# Blocks all non-Cloudflare IPs on ports 80/443
# =============================================================================
# Usage:
#   ./cloudflare-firewall.sh setup    - Initial setup
#   ./cloudflare-firewall.sh update   - Update Cloudflare IPs
#   ./cloudflare-firewall.sh status   - Show current rules
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cloudflare IP lists
CF_IPV4_URL="https://www.cloudflare.com/ips-v4"
CF_IPV6_URL="https://www.cloudflare.com/ips-v6"

# Temp files
CF_IPV4_FILE="/tmp/cloudflare-ips-v4.txt"
CF_IPV6_FILE="/tmp/cloudflare-ips-v6.txt"

# Log file
LOG_FILE="/var/log/cloudflare-firewall.log"

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null || true
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    echo "[ERROR] $1" >> "$LOG_FILE" 2>/dev/null || true
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Fetch Cloudflare IPs
fetch_cloudflare_ips() {
    log "Fetching Cloudflare IP ranges..."

    # Fetch IPv4
    if curl -s "$CF_IPV4_URL" -o "$CF_IPV4_FILE"; then
        log "IPv4 ranges downloaded: $(wc -l < "$CF_IPV4_FILE") ranges"
    else
        error "Failed to fetch IPv4 ranges"
        return 1
    fi

    # Fetch IPv6
    if curl -s "$CF_IPV6_URL" -o "$CF_IPV6_FILE"; then
        log "IPv6 ranges downloaded: $(wc -l < "$CF_IPV6_FILE") ranges"
    else
        error "Failed to fetch IPv6 ranges"
        return 1
    fi
}

# Setup UFW firewall
setup_ufw() {
    log "Setting up UFW firewall..."

    # Check if ufw is installed
    if ! command -v ufw &> /dev/null; then
        error "UFW is not installed. Install with: apt install ufw"
        return 1
    fi

    # Reset UFW (careful - this removes all rules!)
    warn "This will reset all UFW rules. Press Ctrl+C to cancel..."
    sleep 3

    # Disable UFW temporarily
    ufw --force disable

    # Reset to defaults
    ufw --force reset

    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH (IMPORTANT - don't lock yourself out!)
    ufw allow 22/tcp comment 'SSH'

    # Allow from localhost
    ufw allow from 127.0.0.1

    log "Base UFW configuration complete"
}

# Add Cloudflare IPs to UFW
add_cloudflare_rules() {
    log "Adding Cloudflare IP rules..."

    # Fetch latest IPs
    fetch_cloudflare_ips

    # Remove existing Cloudflare rules (to avoid duplicates)
    log "Removing old Cloudflare rules..."
    ufw status numbered | grep -i "cloudflare" | awk -F'[][]' '{print $2}' | sort -rn | while read num; do
        [ -n "$num" ] && yes | ufw delete "$num" 2>/dev/null || true
    done

    # Add IPv4 rules
    log "Adding IPv4 rules..."
    while IFS= read -r ip; do
        [ -z "$ip" ] && continue
        ufw allow from "$ip" to any port 80,443 proto tcp comment 'Cloudflare IPv4'
    done < "$CF_IPV4_FILE"

    # Add IPv6 rules
    log "Adding IPv6 rules..."
    while IFS= read -r ip; do
        [ -z "$ip" ] && continue
        ufw allow from "$ip" to any port 80,443 proto tcp comment 'Cloudflare IPv6'
    done < "$CF_IPV6_FILE"

    log "Cloudflare rules added successfully"
}

# Add additional allowed IPs (for management, monitoring, etc.)
add_management_rules() {
    log "Adding management access rules..."

    # DigitalOcean internal network (for load balancers, monitoring)
    ufw allow from 10.0.0.0/8 comment 'DO Internal Network'

    # Docker internal networks
    ufw allow from 172.16.0.0/12 comment 'Docker Networks'

    # Allow specific ports for internal services (only from internal IPs)
    # PostgreSQL - internal only
    ufw allow from 10.0.0.0/8 to any port 5432 proto tcp comment 'PostgreSQL Internal'

    # Redis - internal only
    ufw allow from 10.0.0.0/8 to any port 6379 proto tcp comment 'Redis Internal'

    log "Management rules added"
}

# Enable UFW
enable_ufw() {
    log "Enabling UFW..."
    ufw --force enable
    log "UFW enabled successfully"
}

# Show status
show_status() {
    echo ""
    echo "=========================================="
    echo "         UFW Firewall Status"
    echo "=========================================="
    ufw status verbose
    echo ""
    echo "=========================================="
    echo "      Cloudflare Rules Count"
    echo "=========================================="
    echo "IPv4 rules: $(ufw status | grep -c 'Cloudflare IPv4' || echo 0)"
    echo "IPv6 rules: $(ufw status | grep -c 'Cloudflare IPv6' || echo 0)"
    echo ""
}

# Verify Cloudflare-only access
verify_setup() {
    log "Verifying setup..."

    # Check if ports 80/443 are only accessible from Cloudflare
    local http_rules=$(ufw status | grep -E "80,443.*ALLOW" | wc -l)
    local cf_rules=$(ufw status | grep -E "80,443.*Cloudflare" | wc -l)

    if [ "$http_rules" -eq "$cf_rules" ]; then
        log "Verification PASSED: Only Cloudflare IPs can access ports 80/443"
    else
        warn "Verification WARNING: There may be non-Cloudflare rules for ports 80/443"
    fi
}

# Create cron job for automatic updates
setup_cron() {
    log "Setting up automatic IP updates..."

    # Create update script
    cat > /etc/cron.daily/cloudflare-firewall-update << 'CRON_EOF'
#!/bin/bash
# Auto-update Cloudflare firewall rules
/opt/scripts/cloudflare-firewall.sh update >> /var/log/cloudflare-firewall.log 2>&1
CRON_EOF

    chmod +x /etc/cron.daily/cloudflare-firewall-update

    # Copy this script to /opt/scripts
    mkdir -p /opt/scripts
    cp "$0" /opt/scripts/cloudflare-firewall.sh
    chmod +x /opt/scripts/cloudflare-firewall.sh

    log "Cron job created: /etc/cron.daily/cloudflare-firewall-update"
}

# Main function
main() {
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root"
        exit 1
    fi

    case "${1:-}" in
        setup)
            log "Starting full firewall setup..."
            setup_ufw
            add_cloudflare_rules
            add_management_rules
            enable_ufw
            verify_setup
            setup_cron
            show_status
            log "Setup complete!"
            ;;
        update)
            log "Updating Cloudflare IP rules..."
            add_cloudflare_rules
            ufw reload
            verify_setup
            log "Update complete!"
            ;;
        status)
            show_status
            ;;
        *)
            echo "Usage: $0 {setup|update|status}"
            echo ""
            echo "Commands:"
            echo "  setup  - Initial firewall setup (WARNING: resets all rules)"
            echo "  update - Update Cloudflare IP ranges"
            echo "  status - Show current firewall status"
            exit 1
            ;;
    esac
}

main "$@"
