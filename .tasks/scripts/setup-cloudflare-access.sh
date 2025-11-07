#!/bin/bash
# Trace: TASK-backlog-003, SPEC-migration-supabase-to-cloudflare-1
# Setup Cloudflare Access for staging environment

set -e

# Configuration
ACCOUNT_ID="6ed03d41ee9287a3e0e5bde9a6772812"
ADMIN_EMAIL="kangdongouk@gmail.com"
APP_DOMAIN="cheongram-board-worker-staging.kangdongouk.workers.dev"
APP_NAME="Cheongram Board Worker - Staging"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 Setting up Cloudflare Access for staging environment${NC}"
echo ""

# Check if CF_API_TOKEN is set
if [ -z "$CF_API_TOKEN" ]; then
  echo -e "${RED}❌ Error: CF_API_TOKEN environment variable not set${NC}"
  echo ""
  echo "Please set your Cloudflare API token with Access permissions:"
  echo "  export CF_API_TOKEN=your-token-here"
  echo ""
  echo "To create a token with Access permissions:"
  echo "  1. Go to https://dash.cloudflare.com/profile/api-tokens"
  echo "  2. Click 'Create Token'"
  echo "  3. Use 'Custom token' template"
  echo "  4. Add permissions: Account > Cloudflare Access > Edit"
  echo "  5. Copy the token and export it"
  exit 1
fi

echo "📋 Configuration:"
echo "  Account ID: $ACCOUNT_ID"
echo "  Admin Email: $ADMIN_EMAIL"
echo "  Application Domain: $APP_DOMAIN"
echo ""

# Step 1: Create Access Application
echo -e "${YELLOW}Step 1: Creating Access Application${NC}"

APP_PAYLOAD=$(cat <<EOF
{
  "name": "$APP_NAME",
  "domain": "$APP_DOMAIN",
  "type": "self_hosted",
  "session_duration": "24h",
  "auto_redirect_to_identity": false,
  "enable_binding_cookie": false,
  "http_only_cookie_attribute": true,
  "same_site_cookie_attribute": "lax",
  "logo_url": "",
  "skip_interstitial": true,
  "app_launcher_visible": true
}
EOF
)

APP_RESPONSE=$(curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/access/apps" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$APP_PAYLOAD")

# Check if application creation was successful
if echo "$APP_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  APP_ID=$(echo "$APP_RESPONSE" | jq -r '.result.id')
  echo -e "${GREEN}✅ Access Application created successfully${NC}"
  echo "   Application ID: $APP_ID"
  echo ""
else
  echo -e "${RED}❌ Failed to create Access Application${NC}"
  echo "Response: $APP_RESPONSE" | jq '.'
  exit 1
fi

# Step 2: Create Access Policy (Allow admin email)
echo -e "${YELLOW}Step 2: Creating Access Policy${NC}"

POLICY_PAYLOAD=$(cat <<EOF
{
  "name": "Allow Admin Email",
  "decision": "allow",
  "include": [
    {
      "email": {
        "email": "$ADMIN_EMAIL"
      }
    }
  ],
  "precedence": 1,
  "session_duration": "24h"
}
EOF
)

POLICY_RESPONSE=$(curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/access/apps/${APP_ID}/policies" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$POLICY_PAYLOAD")

# Check if policy creation was successful
if echo "$POLICY_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  POLICY_ID=$(echo "$POLICY_RESPONSE" | jq -r '.result.id')
  echo -e "${GREEN}✅ Access Policy created successfully${NC}"
  echo "   Policy ID: $POLICY_ID"
  echo ""
else
  echo -e "${RED}❌ Failed to create Access Policy${NC}"
  echo "Response: $POLICY_RESPONSE" | jq '.'
  exit 1
fi

# Step 3: Verify setup
echo -e "${YELLOW}Step 3: Verifying Access setup${NC}"

VERIFY_RESPONSE=$(curl -s -X GET \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/access/apps/${APP_ID}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json")

if echo "$VERIFY_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Access configuration verified${NC}"
  echo ""
  echo "📊 Summary:"
  echo "$VERIFY_RESPONSE" | jq -r '.result | "  Name: \(.name)\n  Domain: \(.domain)\n  Type: \(.type)\n  Session Duration: \(.session_duration)"'
  echo ""
else
  echo -e "${YELLOW}⚠️  Could not verify Access configuration${NC}"
  echo "Response: $VERIFY_RESPONSE" | jq '.'
fi

echo -e "${GREEN}✅ Cloudflare Access setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Remove ALLOW_DEV_HEADER from wrangler.toml staging config"
echo "  2. Redeploy the staging worker: wrangler deploy --env staging"
echo "  3. Test access at: https://$APP_DOMAIN"
echo "  4. You should see the Cloudflare Access login page"
echo ""
