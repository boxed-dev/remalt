-- ============================================
-- SCHEMA MERGE MIGRATION
-- Merges profiles + billing schemas
-- ============================================

-- Step 1: Ensure profiles table exists (from schema.sql)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 2: Add billing columns to profiles (from init.sql users table)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_address JSONB,
  ADD COLUMN IF NOT EXISTS payment_method JSONB;

-- Step 3: Ensure workflows table exists (from schema.sql)
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB DEFAULT '[]'::jsonb NOT NULL,
  edges JSONB DEFAULT '[]'::jsonb NOT NULL,
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb NOT NULL,
  metadata JSONB DEFAULT '{
    "version": "1.0.0",
    "tags": [],
    "isPublic": false
  }'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT workflows_name_not_empty CHECK (char_length(name) > 0)
);

-- Step 4: Create billing tables (from init.sql)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  stripe_customer_id TEXT UNIQUE
);

CREATE TYPE IF NOT EXISTS pricing_type AS ENUM ('one_time', 'recurring');
CREATE TYPE IF NOT EXISTS pricing_plan_interval AS ENUM ('day', 'week', 'month', 'year');
CREATE TYPE IF NOT EXISTS subscription_status AS ENUM ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused');

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  active BOOLEAN DEFAULT TRUE,
  name TEXT,
  description TEXT,
  image TEXT,
  metadata JSONB,
  created TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.prices (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  description TEXT,
  unit_amount BIGINT,
  currency TEXT CHECK (CHAR_LENGTH(currency) = 3),
  type pricing_type,
  interval pricing_plan_interval,
  interval_count INTEGER,
  trial_period_days INTEGER,
  metadata JSONB,
  created TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  status subscription_status,
  metadata JSONB,
  price_id TEXT REFERENCES prices(id),
  quantity INTEGER,
  cancel_at_period_end BOOLEAN,
  created TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  cancel_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  canceled_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  trial_end TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW())
);

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS workflows_created_at_idx ON public.workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS workflows_updated_at_idx ON public.workflows(updated_at DESC);
CREATE INDEX IF NOT EXISTS workflows_metadata_idx ON public.workflows USING gin(metadata);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS prices_product_id_idx ON prices(product_id);

-- Step 6: Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop old policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can view public workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can create their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can update their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can delete their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Products are publicly readable" ON products;
DROP POLICY IF EXISTS "Prices are publicly readable" ON prices;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;

-- Step 8: Create RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view their own workflows"
  ON public.workflows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public workflows"
  ON public.workflows FOR SELECT
  USING ((metadata->>'isPublic')::boolean = true);

CREATE POLICY "Users can create their own workflows"
  ON public.workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
  ON public.workflows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
  ON public.workflows FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Products are publicly readable" ON products
  FOR SELECT USING (true);

CREATE POLICY "Prices are publicly readable" ON prices
  FOR SELECT USING (true);

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Step 9: Unified handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles (primary user data)
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 11: Updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_workflows_updated_at ON public.workflows;
CREATE TRIGGER set_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Step 12: Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.workflows TO authenticated;
GRANT ALL ON public.customers TO authenticated;
GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.prices TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

-- Step 13: Create storage buckets if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'workflow-audio') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('workflow-audio', 'workflow-audio', false);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'instagram-videos') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('instagram-videos', 'instagram-videos', true);
  END IF;
END;
$$;

-- Step 14: Storage policies
DROP POLICY IF EXISTS "Users can read workflow recordings" ON storage.objects;
CREATE POLICY "Users can read workflow recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'workflow-audio'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can upload workflow recordings" ON storage.objects;
CREATE POLICY "Users can upload workflow recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'workflow-audio'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update workflow recordings" ON storage.objects;
CREATE POLICY "Users can update workflow recordings"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'workflow-audio'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'workflow-audio'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete workflow recordings" ON storage.objects;
CREATE POLICY "Users can delete workflow recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'workflow-audio'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Step 15: Instagram videos public access
DROP POLICY IF EXISTS "Public can read instagram videos" ON storage.objects;
CREATE POLICY "Public can read instagram videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'instagram-videos');
