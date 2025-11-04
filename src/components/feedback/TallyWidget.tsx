'use client';

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    Tally?: {
      openPopup: (formId: string, options?: Record<string, unknown>) => void;
      closePopup: (formId: string) => void;
    };
  }
}

export function TallyWidget() {
  const formId = process.env.NEXT_PUBLIC_TALLY_FORM_ID;

  if (!formId) {
    return null;
  }

  return (
    <>
      <Script
        id="tally-js"
        src="https://tally.so/widgets/embed.js"
        strategy="afterInteractive"
      />

      <button
        data-tally-open={formId}
        data-tally-overlay="1"
        data-tally-emoji-text="👋"
        data-tally-emoji-animation="wave"
        className="fixed bottom-6 right-6 bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-full shadow-lg transition-all hover:shadow-xl text-sm font-medium z-50"
      >
        Feedback
      </button>
    </>
  );
}
