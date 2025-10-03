# Supabase Setup Guide for Remalt

This guide will walk you through setting up Supabase for authentication and persistent storage in Remalt.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or sign in
3. Click "New Project"
4. Fill in the details:
   - **Project Name**: `remalt` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
5. Wait for the project to be created (2-3 minutes)

## 2. Get Your API Keys

1. In your Supabase dashboard, click on your project
2. Go to **Settings** → **API**
3. Copy the following values:
   - `Project URL` → This is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3. Update Environment Variables

1. Open `.env.local` in your project root (create if it doesn't exist)
2. Add your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# AI Services
GEMINI_API_KEY=your-gemini-api-key
DEEPGRAM_API_KEY=your-deepgram-api-key

# Python API
PYTHON_API_URL=http://localhost:5001
```

## 4. Set Up Database Schema

### Option A: Using Supabase Dashboard

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the entire contents of `supabase/schema.sql`
4. Click "Run" to execute the SQL

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## 5. Verify Database Setup

1. In Supabase dashboard, go to **Table Editor**
2. You should see two tables:
   - `profiles` - User profiles
   - `workflows` - User workflows
3. Go to **Authentication** → **Policies**
4. Verify Row Level Security (RLS) policies are enabled

## 6. Configure Authentication

### Enable Email/Password Authentication

1. Go to **Authentication** → **Providers**
2. **Email** should be enabled by default
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize "Confirm signup" and "Magic Link" templates

### Enable Google OAuth (Optional)

1. Go to **Authentication** → **Providers**
2. Find **Google** and click "Enable"
3. Follow Supabase's guide to get Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase
5. Save configuration

## 7. Test Authentication

### Test Sign Up

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000/auth/signup`
3. Create a test account
4. Check your email for confirmation (if email confirmation is enabled)
5. Verify user appears in **Authentication** → **Users** in Supabase dashboard

### Test Sign In

1. Navigate to `http://localhost:3000/auth/signin`
2. Sign in with your test account
3. You should be redirected to `/flows`
4. Verify authentication works

## 8. Verify Workflow Persistence

1. Create a new workflow: Click "New Flow" in `/flows`
2. Add some nodes to the canvas
3. The workflow should auto-save every 2 seconds
4. Check Supabase dashboard → **Table Editor** → `workflows`
5. You should see your workflow data stored
6. Refresh the page - your workflow should persist

## 9. Row Level Security (RLS) Policies

The schema includes the following RLS policies:

### Profiles Table

- ✅ Users can view their own profile
- ✅ Users can update their own profile

### Workflows Table

- ✅ Users can view their own workflows
- ✅ Users can view public workflows
- ✅ Users can create their own workflows
- ✅ Users can update their own workflows
- ✅ Users can delete their own workflows

## 10. Database Triggers

The schema includes automatic triggers for:

1. **New User Creation**: Automatically creates a profile when user signs up
2. **Updated Timestamps**: Automatically updates `updated_at` on record changes

## Troubleshooting

### Issue: "Invalid API key" error

**Solution**:
- Verify `.env.local` has correct credentials
- Restart dev server after updating `.env.local`
- Ensure you're using `NEXT_PUBLIC_` prefix for client-side keys

### Issue: "Row Level Security policy violation"

**Solution**:
- Check that RLS policies are properly set up
- Run the SQL schema again if policies are missing
- Verify user is authenticated (check auth state in browser)

### Issue: Workflows not saving

**Solution**:
- Check browser console for errors
- Verify Supabase connection in Network tab
- Ensure user ID is being passed correctly
- Check workflows table exists with correct schema

### Issue: "Failed to fetch" on sign in

**Solution**:
- Verify Supabase project is running (not paused)
- Check CORS settings in Supabase
- Verify API URL is correct (no trailing slash)

## Production Deployment

### Vercel Deployment

1. Deploy your app to Vercel
2. Add environment variables in Vercel dashboard:
   - Settings → Environment Variables
   - Add all variables from `.env.local`
3. Redeploy to apply changes

### Update Supabase Site URL

1. Go to Supabase dashboard → **Authentication** → **URL Configuration**
2. Update **Site URL** to your production domain: `https://your-domain.com`
3. Add **Redirect URLs**:
   - `https://your-domain.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev)

## Security Best Practices

1. ✅ **Never commit `.env.local`** to git (already in `.gitignore`)
2. ✅ **Rotate API keys** if they're exposed
3. ✅ **Use Row Level Security** (RLS) on all tables
4. ✅ **Enable email confirmation** for production
5. ✅ **Set up rate limiting** in Supabase settings
6. ✅ **Monitor Auth logs** in Supabase dashboard

## Next Steps

- [ ] Set up email templates with your branding
- [ ] Configure password reset flow
- [ ] Add user profile editing
- [ ] Implement workflow sharing
- [ ] Set up database backups
- [ ] Monitor usage in Supabase dashboard

## Support

- Supabase Docs: https://supabase.com/docs
- Remalt Issues: https://github.com/your-repo/issues
- Community: https://discord.gg/supabase
