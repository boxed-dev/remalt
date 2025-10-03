# 🚨 FIX YOUR CREDENTIALS - CRITICAL

## THE PROBLEM

Your `.env` file has **MIXED credentials from TWO different Supabase projects**:

```
Browser/Frontend: enohvkozrazgjpbmnkgr ✅ (Correct)
Service Role Key: yjpqktjkpvdmpptduvun ❌ (WRONG PROJECT!)
DATABASE_URL:     yjpqktjkpvdmpptduvun ❌ (WRONG PROJECT!)
```

You signed up with email `rishabh.vaaiv@gmail.com` in project `enohvkozrazgjpbmnkgr`, but your database credentials point to `yjpqktjkpvdmpptduvun`.

This is why the schema can't be applied automatically!

---

## THE SOLUTION (Choose ONE)

### Option 1: Get Correct Credentials for enohvkozrazgjpbmnkgr (RECOMMENDED)

1. **Go to**: https://supabase.com/dashboard/project/enohvkozrazgjpbmnkgr/settings/api

2. **Copy these values**:
   - Project URL: `https://enohvkozrazgjpbmnkgr.supabase.co`
   - `anon` `public` key (you already have this ✅)
   - `service_role` `secret` key ← **COPY THIS!**

3. **Go to**: https://supabase.com/dashboard/project/enohvkozrazgjpbmnkgr/settings/database

4. **Copy the connection strings**:
   - Connection pooling (port 6543)
   - Direct connection (port 5432)

5. **Update `.env`** with ALL values from project `enohvkozrazgjpbmnkgr`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://enohvkozrazgjpbmnkgr.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your existing anon key>
   SUPABASE_SERVICE_ROLE_KEY=<NEW service role key from step 2>

   # Connection pooling
   DATABASE_URL=postgresql://postgres.enohvkozrazgjpbmnkgr:<PASSWORD>@aws-0-...:6543/postgres?pgbouncer=true

   # Direct connection
   DIRECT_URL=postgresql://postgres.enohvkozrazgjpbmnkgr:<PASSWORD>@aws-0-...:5432/postgres
   ```

6. **Apply the schema**:
   ```bash
   node scripts/apply-schema.js
   ```

7. **Verify**:
   - Go to http://localhost:3000/test-setup
   - All tests should pass ✅

---

### Option 2: Use Project yjpqktjkpvdmpptduvun Instead

If you want to use the OTHER project (where you already ran the schema):

1. **Go to**: https://supabase.com/dashboard/project/yjpqktjkpvdmpptduvun/settings/api

2. **Copy**:
   - Project URL
   - `anon` `public` key

3. **Update `.env`**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://yjpqktjkpvdmpptduvun.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from that project>
   ```

4. **Sign up again** in that project:
   - Go to http://localhost:3000/auth/signup
   - Use the same email: rishabh.vaaiv@gmail.com
   - Create a new password

5. **Restart dev server**:
   ```bash
   npm run dev
   ```

6. **Verify**:
   - Go to http://localhost:3000/test-setup
   - All tests should pass ✅

---

## QUICK MANUAL FIX (If automation fails)

If you just want it to work RIGHT NOW:

1. Open: https://supabase.com/dashboard/project/enohvkozrazgjpbmnkgr/sql/new

2. Copy **ALL 163 lines** from `supabase/schema.sql`

3. Paste and click **RUN**

4. Done! Go to http://localhost:3000/test-setup to verify

---

## WHY THIS HAPPENED

You likely:
1. Created project `enohvkozrazgjpbmnkgr` first
2. Signed up and got the anon key
3. Later created or used project `yjpqktjkpvdmpptduvun`
4. Copied DATABASE_URL from there
5. Mixed credentials in .env

**Result**: Browser talks to one project, database credentials point to another!
