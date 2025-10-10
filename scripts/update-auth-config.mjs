import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://enohvkozrazgjpbmnkgr.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVub2h2a296cmF6Z2pwYm1ua2dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE3MjQzNiwiZXhwIjoyMDc0NzQ4NDM2fQ.8fs2Q0bj8jnt_1JQvzNN04JgfOmi3_oHk-pbRGdu3A8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const AUTH_CONFIG = {
  SITE_URL: 'https://remalt.vercel.app',
  REDIRECT_URLS: [
    'http://localhost:3000/**',
    'http://127.0.0.1:3000/**',
    'https://remalt.vercel.app/**',
    'https://remalt.vercel.app/auth/callback',
    'https://remalt-*.vercel.app/**'
  ]
};

async function updateAuthConfig() {
  console.log('🔧 Updating Supabase Auth Configuration...\n');

  console.log('❌ Unfortunately, the Supabase JS client does not support updating auth configuration programmatically.');
  console.log('   Auth settings can only be updated through:');
  console.log('   1. Supabase Dashboard UI');
  console.log('   2. Supabase Management API (requires separate API key)\n');

  console.log('📋 Manual Configuration Instructions:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/enohvkozrazgjpbmnkgr/auth/url-configuration\n');

  console.log('2. Set Site URL:');
  console.log(`   ${AUTH_CONFIG.SITE_URL}\n`);

  console.log('3. Set Redirect URLs (add all of these):');
  AUTH_CONFIG.REDIRECT_URLS.forEach(url => {
    console.log(`   ${url}`);
  });

  console.log('\n✅ After updating, your auth will work on:');
  console.log('   • Local: http://localhost:3000');
  console.log('   • Production: https://remalt.vercel.app');
  console.log('   • Previews: https://remalt-*.vercel.app\n');
}

updateAuthConfig();
