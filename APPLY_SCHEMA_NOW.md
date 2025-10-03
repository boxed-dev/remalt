# 🚨 APPLY DATABASE SCHEMA - CRITICAL

## THE PROBLEM

Your browser is trying to save workflows to project **enohvkozrazgjpbmnkgr**, but the `workflows` table doesn't exist there.

You likely ran the schema in the WRONG project (`yjpqktjkpvdmpptduvun`).

## THE SOLUTION

### Step 1: Go to the CORRECT Supabase Project

1. Open: https://supabase.com/dashboard/project/enohvkozrazgjpbmnkgr
2. **VERIFY** the URL shows `enohvkozrazgjpbmnkgr` (not `yjpqktjkpvdmpptduvun`)

### Step 2: Open SQL Editor

1. Click **SQL Editor** in the left sidebar
2. Click **New Query**

### Step 3: Copy and Run the Schema

1. Open the file: `supabase/schema.sql` in your code editor
2. **Copy ALL 163 lines** (the entire file)
3. Paste into the Supabase SQL Editor
4. Click **Run** button

### Step 4: Verify Tables Created

1. Go to **Table Editor** in left sidebar
2. You should see TWO tables:
   - ✅ `profiles`
   - ✅ `workflows`

### Step 5: Test Again

1. Go back to http://localhost:3000/test-setup
2. Click **Run All Tests**
3. All tests should now pass ✅

---

## If You Want to Use the OTHER Project Instead

If you prefer to use project `yjpqktjkpvdmpptduvun`, you need to:

1. Get the URL and anon key for that project from Supabase dashboard
2. Update `.env`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://yjpqktjkpvdmpptduvun.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from supabase dashboard>
   ```
3. Run the schema in that project
4. Restart dev server

---

**CURRENT PROJECT:** enohvkozrazgjpbmnkgr ← Use this one!
**WRONG PROJECT:** yjpqktjkpvdmpptduvun ← Don't use this for workflows
