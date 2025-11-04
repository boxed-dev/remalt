'use client';

import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/hooks/use-current-user';
import Script from 'next/script';

declare global {
  interface Window {
    Featurebase: (action: string, config: Record<string, unknown>) => void;
  }
}

export function FeaturebaseWidget() {
  const user = useCurrentUser();
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const organization = process.env.NEXT_PUBLIC_FEATUREBASE_ORG;

  // Fetch JWT token when user is authenticated
  useEffect(() => {
    if (user) {
      fetch('/api/featurebase/token')
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setJwtToken(data.token);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch FeatureBase token:', error);
        });
    }
  }, [user]);

  // Initialize widget when SDK loads and token is ready
  useEffect(() => {
    if (!sdkLoaded || !organization) return;

    // Wait a bit for the SDK to be fully ready
    const initTimer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.Featurebase) {
        const config: Record<string, unknown> = {
          organization,
          theme: 'light',
          placement: 'right',
          locale: 'en',
        };

        // Add JWT token if user is authenticated and token is available
        if (user && jwtToken) {
          config.jwtToken = jwtToken;
        }

        console.log('Initializing FeatureBase widget with config:', {
          organization,
          hasUser: !!user,
          hasToken: !!jwtToken
        });

        window.Featurebase('initialize_feedback_widget', config);
      }
    }, 100);

    return () => clearTimeout(initTimer);
  }, [sdkLoaded, organization, user, jwtToken]);

  if (!organization) {
    console.warn('NEXT_PUBLIC_FEATUREBASE_ORG is not configured');
    return null;
  }

  return (
    <>
      {/* FeatureBase SDK Script */}
      <Script
        id="featurebase-sdk"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('FeatureBase SDK loaded');
          setSdkLoaded(true);
        }}
        dangerouslySetInnerHTML={{
          __html: `
!(function(e,t){const a="featurebase-sdk";function n(){if(!t.getElementById(a)){var e=t.createElement("script");(e.id=a),(e.src="https://do.featurebase.app/js/sdk.js"),t.getElementsByTagName("script")[0].parentNode.insertBefore(e,t.getElementsByTagName("script")[0])}}"function"!=typeof e.Featurebase&&(e.Featurebase=function(){(e.Featurebase.q=e.Featurebase.q||[]).push(arguments)}),"complete"===t.readyState||"interactive"===t.readyState?n():t.addEventListener("DOMContentLoaded",n)})(window,document);
          `,
        }}
      />
    </>
  );
}
