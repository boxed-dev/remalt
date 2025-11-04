import { createClient } from '@/lib/supabase/server';
import { generateFeaturebaseJWT } from '@/lib/featurebase/jwt';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user profile for full name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Generate JWT token
    const token = await generateFeaturebaseJWT(
      user.id,
      user.email!,
      profile?.full_name || undefined
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating FeatureBase token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
