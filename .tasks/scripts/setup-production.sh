#!/bin/bash

# Production Setup Script
# Trace: TASK-backlog-004
# Complete production environment configuration

set -e

echo "=== Cheongram Board - Production Setup ==="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Set Production Secrets${NC}"
echo "Setting ADMIN_EMAILS secret for production..."
wrangler secret put ADMIN_EMAILS --env="" <<< "kangdongouk@gmail.com"
echo -e "${GREEN}✓ ADMIN_EMAILS secret configured${NC}"
echo ""

echo -e "${BLUE}Step 2: Deploy with Custom Domain${NC}"
echo "Deploying worker with custom domain configuration..."
cd "$(dirname "$0")/../../api" && npm run deploy:production
echo -e "${GREEN}✓ Worker deployed${NC}"
echo ""

echo -e "${BLUE}Step 3: DNS Configuration${NC}"
echo -e "${YELLOW}⚠️  Manual action required:${NC}"
echo ""
echo "1. Go to Cloudflare Dashboard: https://dash.cloudflare.com"
echo "2. Select your domain: kadragon.work"
echo "3. Go to DNS > Records"
echo "4. Add CNAME record:"
echo "   - Type: CNAME"
echo "   - Name: crb"
echo "   - Target: cheongram-board.kangdongouk.workers.dev"
echo "   - Proxy status: Proxied (orange cloud)"
echo "   - TTL: Auto"
echo ""
echo "5. Wait for DNS propagation (usually 1-5 minutes)"
echo ""

echo -e "${BLUE}Step 4: Cloudflare Access Setup${NC}"
echo -e "${YELLOW}⚠️  Manual action required:${NC}"
echo ""
echo "1. Go to Zero Trust Dashboard: https://one.dash.cloudflare.com"
echo "2. Navigate to: Access > Applications"
echo "3. Click 'Add an application' > 'Self-hosted'"
echo "4. Configure application:"
echo "   - Application name: Cheongram Board Admin"
echo "   - Session Duration: 24 hours"
echo "   - Application domain: crb.kadragon.work"
echo "   - Path: /admin/*"
echo ""
echo "5. Add Access Policy:"
echo "   - Policy name: Admin Users"
echo "   - Action: Allow"
echo "   - Include rule: Email - kangdongouk@gmail.com"
echo ""
echo "6. Save and deploy"
echo ""

echo -e "${BLUE}Step 5: Verify Setup${NC}"
echo "Run the following commands to verify:"
echo ""
echo "# Test custom domain"
echo "curl https://crb.kadragon.work/api"
echo ""
echo "# Test frontend"
echo "curl -I https://crb.kadragon.work"
echo ""
echo "# Test admin authentication (should redirect to Cloudflare Access)"
echo "curl -I https://crb.kadragon.work/admin/games"
echo ""

echo -e "${GREEN}=== Setup Instructions Complete ===${NC}"
echo ""
echo -e "${YELLOW}Note:${NC} After completing manual steps, run:"
echo "  .tasks/scripts/verify-production.sh"
echo ""
