import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/ui/resizable-navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Remalt - The AI Canvas for creating content that sells",
  description:
    "Create, automate, and optimize AI-powered workflows with our intuitive drag-and-drop interface. From content creation to data analysis.",
  keywords: [
    "AI workflows",
    "workflow automation",
    "AI tools",
    "drag and drop",
    "content creation",
    "data analysis",
    "AI automation",
  ],
  authors: [{ name: "Remalt" }],
  creator: "Remalt",
  publisher: "Remalt",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://remalt.com"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Remalt - Build AI Workflows That Actually Work",
    description:
      "Create, automate, and optimize AI-powered workflows with our intuitive drag-and-drop interface. From content creation to data analysis.",
    url: "/",
    siteName: "Remalt",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Remalt - AI Workflow Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Remalt - Build AI Workflows That Actually Work",
    description:
      "Create, automate, and optimize AI-powered workflows with our intuitive drag-and-drop interface.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/logo.png" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/logo.png" }],
    shortcut: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Remalt",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Create, automate, and optimize AI-powered workflows with our intuitive drag-and-drop interface. From content creation to data analysis.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "150",
    },
    featureList: [
      "Drag-and-drop workflow builder",
      "AI-powered automation",
      "Content creation tools",
      "Data analysis capabilities",
      "Multi-model AI integration",
    ],
  };

  return (
    <html lang="en">
      <head>
        <script async src="https://tally.so/widgets/embed.js"></script>
        <link rel="icon" href="/logo.png" type="image/png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta
          name="google-site-verification"
          content="lcrzAV3unahTRHAA0_6Rp-SgA1QLOi7X5PK49I7ru48"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script async src="https://tally.so/widgets/embed.js"></script>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Remalt Blog"
          href="/rss.xml"
        />
        <meta
          name="google-site-verification"
          content="your-verification-code"
        />
        <script src="https://getlaunchlist.com/js/widget.js" defer></script>
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* <AuthHeader /> */}
        <Navbar>{children}</Navbar>
      </body>
    </html>
  );
}
