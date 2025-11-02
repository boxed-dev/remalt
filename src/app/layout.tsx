import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import * as Sentry from '@sentry/nextjs';
import './globals.css';
import { GlobalHeader } from '@/components/layout/global-header';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: "Remalt - Build AI Canvas That Actually Work",
  description: "Create, automate, and optimize AI-powered canvas with our intuitive drag-and-drop interface. From content creation to data analysis.",
};

function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body
        className="font-sans antialiased"
        suppressHydrationWarning
      >
        <GlobalHeader />
        <main className="pt-14">
          <Sentry.ErrorBoundary fallback={<p>Something went wrong. Please refresh.</p>}>
            {children}
          </Sentry.ErrorBoundary>
        </main>
        <Toaster position="bottom-right" richColors expand={true} />
      </body>
    </html>
  );
}

export default RootLayout;
