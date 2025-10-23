'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function ApplySchemaPage() {
  const [status, setStatus] = useState<'idle' | 'applying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const applySchema = async () => {
    setStatus('applying');
    setMessage('Fetching schema...');

    try {
      // Fetch the schema file
      const schemaResponse = await fetch('/schema.sql');
      if (!schemaResponse.ok) {
        throw new Error('Could not load schema.sql file');
      }
      const schema = await schemaResponse.text();

      setMessage('Applying schema to Supabase...');

      // Execute the schema via Supabase REST API
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey!,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ query: schema }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to apply schema: ${error}`);
      }

      setStatus('success');
      setMessage('✅ Schema applied successfully! Go to /test-setup to verify.');
    } catch (error: any) {
      setStatus('error');
      setMessage(`❌ Error: ${error.message}. Please apply manually via Supabase dashboard.`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Apply Database Schema</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Project</h2>
          <div className="bg-gray-100 p-4 rounded font-mono text-sm">
            {process.env.NEXT_PUBLIC_SUPABASE_URL}
          </div>
          <p className="text-gray-600 mt-2">
            Project ID: <strong>{process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}</strong>
          </p>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-yellow-800 mb-3">⚠️ Manual Application Required</h2>
          <p className="text-yellow-700 mb-4">
            The Supabase REST API doesn't support executing arbitrary SQL. You must apply the schema manually.
          </p>

          <div className="bg-white rounded p-4 space-y-2">
            <h3 className="font-bold mb-2">Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Open: <a
                  href={`https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#095D40] underline"
                >
                  Supabase SQL Editor
                </a>
              </li>
              <li>Click <strong>"New Query"</strong></li>
              <li>Copy ALL contents from <code className="bg-gray-100 px-2 py-1 rounded">supabase/schema.sql</code></li>
              <li>Paste into the SQL editor</li>
              <li>Click <strong>"Run"</strong></li>
              <li>Verify tables created: <code className="bg-gray-100 px-2 py-1 rounded">profiles</code> and <code className="bg-gray-100 px-2 py-1 rounded">workflows</code></li>
              <li>Return to <a href="/test-setup" className="text-[#095D40] underline">/test-setup</a> to verify</li>
            </ol>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Schema Contents Preview</h2>
          <div className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-auto max-h-96 font-mono">
            <pre>{`-- ============================================
-- REMALT DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- WORKFLOWS TABLE
-- ============================================
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

-- Create indexes
CREATE INDEX IF NOT EXISTS workflows_user_id_idx ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS workflows_created_at_idx ON public.workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS workflows_updated_at_idx ON public.workflows(updated_at DESC);
CREATE INDEX IF NOT EXISTS workflows_metadata_idx ON public.workflows USING gin(metadata);

-- Enable Row Level Security
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Workflows policies
CREATE POLICY "Users can view their own workflows"
  ON public.workflows FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public workflows"
  ON public.workflows FOR SELECT USING ((metadata->>'isPublic')::boolean = true);

CREATE POLICY "Users can create their own workflows"
  ON public.workflows FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
  ON public.workflows FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
  ON public.workflows FOR DELETE USING (auth.uid() = user_id);

-- ... (triggers and functions follow)`}</pre>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <Button asChild>
            <a
              href={`https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}/sql/new`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Supabase SQL Editor
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/test-setup">Test Setup</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
