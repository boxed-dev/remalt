#!/usr/bin/env node
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: join(__dirname, '..', '.env') });

console.log('\n🔍 Sentry Configuration Verification\n');
console.log('═'.repeat(50));

const checks = [
  {
    name: 'SENTRY_DSN',
    value: process.env.SENTRY_DSN,
    validator: (v) => v && v.startsWith('https://') && v.includes('ingest') && v.includes('sentry.io'),
    description: 'Data Source Name (public key for sending events)',
  },
  {
    name: 'SENTRY_ORG',
    value: process.env.SENTRY_ORG,
    validator: (v) => v && v.length > 0,
    description: 'Organization slug',
  },
  {
    name: 'SENTRY_PROJECT',
    value: process.env.SENTRY_PROJECT,
    validator: (v) => v && v.length > 0,
    description: 'Project slug',
  },
  {
    name: 'SENTRY_AUTH_TOKEN',
    value: process.env.SENTRY_AUTH_TOKEN,
    validator: (v) => v && v.startsWith('sntrys_'),
    description: 'Auth token for source maps & releases',
  },
  {
    name: 'SENTRY_PROJECT_IDS',
    value: process.env.SENTRY_PROJECT_IDS,
    validator: (v) => v && /^\d+$/.test(v),
    description: 'Project ID for tunnel endpoint',
  },
  {
    name: 'SENTRY_ENVIRONMENT',
    value: process.env.SENTRY_ENVIRONMENT,
    validator: (v) => v && v.length > 0,
    description: 'Environment name (development/production)',
  },
];

let allValid = true;

checks.forEach((check) => {
  const isValid = check.validator(check.value);
  const status = isValid ? '✅' : '❌';
  const maskedValue = check.value
    ? check.name.includes('TOKEN') || check.name.includes('DSN')
      ? `${check.value.substring(0, 20)}...`
      : check.value
    : 'NOT SET';

  console.log(`\n${status} ${check.name}`);
  console.log(`   ${check.description}`);
  console.log(`   Value: ${maskedValue}`);

  if (!isValid) {
    allValid = false;
    console.log(`   ⚠️  MISSING OR INVALID`);
  }
});

console.log('\n' + '═'.repeat(50));

if (allValid) {
  console.log('\n✅ All Sentry configuration is valid!\n');
  console.log('📝 Next steps:');
  console.log('   1. Test error tracking: Run `pnpm dev` and trigger an error');
  console.log('   2. Check Sentry dashboard: https://sentry.io/organizations/rishabh-icp/projects/flowy-web/');
  console.log('   3. Verify events are being received\n');
} else {
  console.log('\n❌ Some configuration is missing or invalid.');
  console.log('\n📝 To generate missing tokens, visit:');
  console.log('   - DSN: https://sentry.io/organizations/rishabh-icp/projects/flowy-web/settings/keys/');
  console.log('   - Auth Token: https://sentry.io/orgredirect/organizations/rishabh-icp/settings/auth-tokens/');
  console.log('     Required scopes: project:releases, org:read\n');
}

// Extract and display parsed DSN info
if (process.env.SENTRY_DSN) {
  try {
    const dsnUrl = new URL(process.env.SENTRY_DSN);
    const projectId = dsnUrl.pathname.replace('/', '');
    console.log('📊 Parsed DSN Information:');
    console.log(`   Organization ID: ${dsnUrl.hostname.split('.')[0]}`);
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Region: ${dsnUrl.hostname.includes('.us.') ? 'US' : 'EU'}`);
    console.log('');
  } catch (e) {
    console.log('⚠️  Failed to parse DSN URL\n');
  }
}
