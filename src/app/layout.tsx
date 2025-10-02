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
  title: "Remalt - Build AI Workflows That Actually Work",
  description: "Create, automate, and optimize AI-powered workflows with our intuitive drag-and-drop interface. From content creation to data analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        {/* <AuthHeader /> */}
         <Navbar >{children}
          </Navbar>
      </body>
    </html>
  );
}
