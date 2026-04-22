# Google OAuth Setup Guide

## Steps to Configure Google OAuth

### 1. Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Sign in with your Google account

### 2. Create a New Project (or select existing)
- Click "Select a project" → "New Project"
- Enter project name: "Horologue Auth"
- Click "Create"

### 3. Enable Google+ API
- Go to "APIs & Services" → "Library"
- Search for "Google+ API" 
- Click on it and press "Enable"

### 4. Create OAuth 2.0 Credentials
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "OAuth 2.0 Client IDs"
- Choose "Web application"
- Name: "Horologue Web Client"

### 5. Configure Authorized URLs
**Authorized JavaScript origins:**
```
http://localhost:4000
```

**Authorized redirect URIs:**
```
http://localhost:4000/auth/google/callback
```

### 6. Get Your Credentials
After creating, you'll get:
- Client ID
- Client Secret

### 7. Update Your .env File
Replace the placeholder values in your `.env` file:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
```

### 8. For Production
When deploying to production, update:
- Authorized JavaScript origins: `https://yourdomain.com`
- Authorized redirect URIs: `https://yourdomain.com/auth/google/callback`
- Update GOOGLE_CALLBACK_URL in production .env

## Features Implemented

✅ Google OAuth login/register
✅ Automatic user creation for new Google users
✅ Link Google account to existing email users
✅ Session management for Google users
✅ Admin/regular user redirection
✅ Error handling for failed authentication
✅ Logout support for Google users

## How It Works

1. User clicks "Login with Google" button
2. Redirected to Google OAuth consent screen
3. After approval, Google redirects back to `/auth/google/callback`
4. System checks if user exists:
   - If exists: Login user
   - If email exists but no Google ID: Link accounts
   - If new user: Create account automatically
5. User is redirected to appropriate dashboard

## Security Notes

- Google accounts are automatically verified (isVerified: true)
- No password required for Google users
- Session and passport authentication work together
- Proper error handling for failed authentications