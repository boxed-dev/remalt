-- ============================================
-- FIX MISSING PROFILES
-- ============================================
-- This script creates profile records for users who don't have them
-- Run this in the Supabase SQL Editor

-- Insert missing profiles for all authenticated users
INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.raw_user_meta_data->>'avatar_url' as avatar_url,
  u.created_at,
  NOW() as updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- Verify the fix
SELECT 
  COUNT(*) as users_without_profiles
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- Should return 0

