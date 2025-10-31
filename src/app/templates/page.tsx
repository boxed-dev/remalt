import { Suspense } from 'react';
import { TemplatesClient } from '@/components/templates/templates-client';
import { FlowsSidebar } from '@/components/flows/flows-sidebar';
import { createClient } from '@/lib/supabase/server';
import { getPublicTemplates } from '@/lib/supabase/workflows';
import { LoadingScreen } from '@/components/ui/loading';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Templates | Remalt',
  description: 'Discover and use AI-powered workflow templates created by the community',
};

// Cache templates for 60 seconds
export const revalidate = 60;

async function TemplatesContent() {
  const supabase = await createClient();

  // Fetch public templates (no authentication required)
  const templates = await getPublicTemplates(supabase);

  // Get current user (optional - for checking if signed in)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex">
      <FlowsSidebar />
      <TemplatesClient initialTemplates={templates} currentUser={user} />
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading templates..." />}>
      <TemplatesContent />
    </Suspense>
  );
}
