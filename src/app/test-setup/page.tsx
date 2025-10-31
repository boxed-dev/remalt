'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function TestSetupPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const testResults: any[] = [];
    const supabase = createClient();

    // Test 1: Check environment variables
    testResults.push({
      test: '1. Environment Variables',
      passed: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      details: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    });

    // Test 2: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    testResults.push({
      test: '2. User Authentication',
      passed: !!user && !authError,
      details: {
        authenticated: !!user,
        userId: user?.id,
        email: user?.email,
        error: authError?.message,
      },
    });

    if (!user) {
      testResults.push({
        test: 'STOP',
        passed: false,
        details: {
          message: 'Please sign up or sign in first at /auth/signup or /auth/signin',
        },
      });
      setResults(testResults);
      setLoading(false);
      return;
    }

    // Test 3: Check if workflows table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('workflows')
      .select('id')
      .limit(1);

    testResults.push({
      test: '3. Canvas Table Exists',
      passed: !tableError || tableError.code !== '42P01',
      details: {
        error: tableError ? {
          message: tableError.message,
          code: tableError.code,
          details: tableError.details,
          hint: tableError.hint,
        } : null,
      },
    });

    if (tableError && tableError.code === '42P01') {
      testResults.push({
        test: 'STOP',
        passed: false,
        details: {
          message: 'Table "canvas" does not exist. Run the SQL in supabase/schema.sql in Supabase SQL Editor.',
          instructions: [
            '1. Go to https://supabase.com/dashboard',
            `2. Select project: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}`,
            '3. Go to SQL Editor',
            '4. Copy ALL content from supabase/schema.sql',
            '5. Paste and click "Run"',
          ],
        },
      });
      setResults(testResults);
      setLoading(false);
      return;
    }

    // Test 4: Try to insert a test workflow
    const testWorkflow = {
      id: crypto.randomUUID(),
      user_id: user.id,
      name: 'Test Workflow - DELETE ME',
      description: 'Automated test workflow',
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      metadata: { version: '1.0.0', tags: [], isPublic: false },
    };

    const { data: insertData, error: insertError } = await supabase
      .from('workflows')
      .insert(testWorkflow)
      .select()
      .single();

    testResults.push({
      test: '4. Can Insert Workflow',
      passed: !insertError,
      details: {
        inserted: !!insertData,
        error: insertError ? {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        } : null,
      },
    });

    if (insertError) {
      testResults.push({
        test: 'STOP',
        passed: false,
        details: {
          message: 'Cannot insert workflow. Likely RLS policy issue.',
          error: insertError,
        },
      });
      setResults(testResults);
      setLoading(false);
      return;
    }

    // Test 5: Try to update the workflow (UPSERT)
    const { data: upsertData, error: upsertError } = await supabase
      .from('workflows')
      .upsert({
        ...testWorkflow,
        name: 'Updated Test Workflow - DELETE ME',
      })
      .select()
      .single();

    testResults.push({
      test: '5. Can Upsert Workflow',
      passed: !upsertError,
      details: {
        upserted: !!upsertData,
        error: upsertError ? {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint,
        } : null,
      },
    });

    // Test 6: Clean up - delete test workflow
    const { error: deleteError } = await supabase
      .from('workflows')
      .delete()
      .eq('id', testWorkflow.id);

    testResults.push({
      test: '6. Can Delete Workflow',
      passed: !deleteError,
      details: {
        error: deleteError ? {
          message: deleteError.message,
          code: deleteError.code,
        } : null,
      },
    });

    setResults(testResults);
    setLoading(false);
  };

  const allPassed = results.length > 0 && results.every(r => r.test === 'STOP' || r.passed);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Database Setup Test</h1>

        <Button onClick={runTests} disabled={loading} className="mb-6">
          {loading ? 'Running Tests...' : 'Run All Tests'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-4">
            {allPassed && (
              <div className="p-6 bg-green-50 border-2 border-green-500 rounded-lg">
                <h2 className="text-2xl font-bold text-green-700 mb-2">✅ All Tests Passed!</h2>
                <p className="text-green-600">Your database is set up correctly. Workflow save/load should work perfectly.</p>
              </div>
            )}

            {results.map((result, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border-2 ${
                  result.test === 'STOP'
                    ? 'bg-red-50 border-red-500'
                    : result.passed
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <h3 className="font-bold text-lg mb-2">
                  {result.test === 'STOP' ? '🛑 CRITICAL ISSUE' : result.test}
                  {result.test !== 'STOP' && (
                    <span className="ml-2">{result.passed ? '✅' : '❌'}</span>
                  )}
                </h3>
                <pre className="bg-white p-3 rounded text-sm overflow-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
