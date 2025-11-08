# Cloudflare Access Setup Guide

**Trace**: TASK-admin-auth-001
**Date**: 2025-11-08
**Purpose**: Enable admin authentication for cheongram-board production

---

## Overview

This guide walks through setting up Cloudflare Access to protect admin endpoints
of the cheongram-board application at `crb.kadragon.work`.

---

## Prerequisites

- Cloudflare account with access to `kadragon.work` domain
- Admin email: `kangdongouk@gmail.com`
- Production Worker deployed at: `crb.kadragon.work`

---

## Step 1: Enable Cloudflare Zero Trust

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select the `kadragon.work` domain
3. Click **"Zero Trust"** in the left sidebar
4. If prompted, complete the Zero Trust onboarding:
   - Choose a team name (e.g., `kadragon`)
   - Your Zero Trust dashboard will be at: `https://kadragon.cloudflareaccess.com`

---

## Step 2: Create Access Application

### Option A: Via Dashboard (Recommended)

1. In Zero Trust dashboard, go to **Access → Applications**
2. Click **"Add an application"**
3. Choose **"Self-hosted"**
4. Configure application:

   **Application Configuration:**
   ```
   Application name: Cheongram Board Admin
   Session Duration: 24 hours
   Application domain: crb.kadragon.work
   ```

   **Path Configuration:**
   ```
   Path: /api/*
   ```

5. Click **"Next"**

### Option B: Via API (Advanced)

Use the Cloudflare API to create the application programmatically.

---

## Step 3: Create Access Policy

1. After creating the application, you'll be prompted to add a policy
2. Click **"Add a policy"**
3. Configure policy:

   **Policy Configuration:**
   ```
   Policy name: Admin Only
   Action: Allow
   Decision: Allow
   Session duration: 24 hours
   ```

   **Include Rules:**
   ```
   Rule type: Emails
   Value: kangdongouk@gmail.com
   ```

4. Click **"Save policy"**

---

## Step 4: Configure Identity Provider

Cloudflare Access needs to know how to authenticate users. We'll use email OTP (One-Time Password).

1. Go to **Settings → Authentication**
2. Under **Login methods**, ensure **"One-time PIN"** is enabled
3. Click **"Add new"** if needed, and select **"One-time PIN"**
4. Save

**Alternative:** You can also configure Google OAuth:
1. Click **"Add new"** → **"Google"**
2. Follow the instructions to set up Google OAuth
3. This provides a better user experience

---

## Step 5: Test Access

1. Open a new incognito/private browser window
2. Navigate to: `https://crb.kadragon.work`
3. You should see the Cloudflare Access login page
4. Enter `kangdongouk@gmail.com`
5. Check email for OTP code
6. Enter the code
7. You should now be authenticated and redirected to the app

---

## Step 6: Verify Headers

After authentication, Cloudflare Access will inject the following header:

```
CF-Access-Authenticated-User-Email: kangdongouk@gmail.com
```

Our Worker middleware (`api/src/lib/auth/middleware.ts`) will read this header
and grant admin access.

---

## Step 7: Update Worker Configuration

After Cloudflare Access is set up, we need to ensure the Worker is configured
to only accept requests from Cloudflare Access.

**Option 1: Keep current setup (Simple)**
- No changes needed
- Worker will accept both CF-Access header and direct requests
- Cloudflare Access controls who can reach the Worker

**Option 2: Strict mode (Advanced)**
- Add CORS validation to only accept requests from Cloudflare Access
- Reject requests without CF-Access header in production

For now, we'll use **Option 1** (keep current setup).

---

## Step 8: Disable Development Header in Production

To ensure security, we should NOT set `ALLOW_DEV_HEADER` in production.

Current production config in `wrangler.toml`:
```toml
# Production (default environment)
[vars]
NODE_ENV = "production"
# ALLOW_DEV_HEADER is NOT set (good!)
```

**Status:** ✅ Already correct - no changes needed.

---

## Step 9: Deploy and Test

After setting up Cloudflare Access:

1. **Redeploy Worker** (to ensure latest code):
   ```bash
   cd api
   npm run deploy:production
   ```

2. **Test public endpoints** (should work without auth):
   ```bash
   curl https://crb.kadragon.work/api/games
   ```

3. **Test admin endpoints** (should require Cloudflare Access):
   ```bash
   # This should redirect to Cloudflare Access login
   open https://crb.kadragon.work/api/games
   ```

4. **After logging in**, admin operations should work in the web UI.

---

## Troubleshooting

### Issue: "Authentication required" error even after login

**Cause:** Worker is not receiving CF-Access header

**Solution:**
1. Check Cloudflare Access application configuration
2. Ensure the application domain matches: `crb.kadragon.work`
3. Check that the path includes: `/api/*`
4. Verify the policy allows your email: `kangdongouk@gmail.com`

### Issue: Access login page not appearing

**Cause:** Cloudflare Access application not created or not covering the correct path

**Solution:**
1. Verify application exists in Zero Trust dashboard
2. Check application domain and path configuration
3. Ensure application is "Enabled"

### Issue: Headers not being passed to Worker

**Cause:** Cloudflare Access might not be configured correctly

**Solution:**
1. Check Access application logs in Zero Trust dashboard
2. Verify JWT validation settings
3. Ensure "CORS Settings" allow the headers

---

## Configuration Summary

**Cloudflare Access:**
- Application: Cheongram Board Admin
- Domain: crb.kadragon.work
- Path: /api/*
- Policy: Allow kangdongouk@gmail.com
- Session: 24 hours
- Identity Provider: One-time PIN (or Google OAuth)

**Worker Configuration:**
- Production domain: crb.kadragon.work
- Auth middleware: api/src/lib/auth/middleware.ts
- Admin email: kangdongouk@gmail.com (from ADMIN_EMAILS secret)
- Dev header: Disabled in production (secure)

---

## Next Steps

After Cloudflare Access is working:

1. ✅ Admin can log in and manage games/rentals
2. 🔄 Monitor Access logs for unauthorized attempts
3. 📊 Consider adding more admins if needed
4. 🔐 Consider adding 2FA for additional security

---

## References

- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/applications/)
- [Workers + Access Integration](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/)
- Worker middleware: `api/src/lib/auth/middleware.ts`

---

**Maintainer:** kadragon
**Last Updated:** 2025-11-08
