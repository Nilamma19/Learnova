import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // optional: improve font loading
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "Learnova - Smart Student Engagement & Attendance Platform",
    template: "%s | Learnova",
  },
  description:
    "Join thousands of learners on Learnova and discover courses that will transform your career and expand your knowledge.",
  keywords: [
    "student engagement",
    "attendance platform",
    "online learning",
    "education",
    "courses",
    "e-learning",
    "classroom management",
    "school software",
    "teacher tools",
    "smart attendance",
    "Learnova"
  ],
  alternates: {
    canonical: "https://learnova-web.vercel.app",
  },
  openGraph: {
    title: "Learnova - Smart Student Engagement & Attendance Platform",
    description:
      "Join thousands of learners on Learnova and discover courses that will transform your career and expand your knowledge.",
    url: "https://learnova-web.vercel.com",
    siteName: "Learnova",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Learnova Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Learnova - Smart Student Engagement & Attendance Platform",
    description:
      "Join thousands of learners on Learnova and discover courses that will transform your career and expand your knowledge.",
    site: "@learnova",
    creator: "@learnova",
    images: ["/og-image.jpg"],
  },
  other: {
    "application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Learnova",
      url: "https://learnova-web.vercel.app",
      logo: "https://learnova-web.vercel.app/og-image.jpg",
      sameAs: ["https://twitter.com/learnova", "https://facebook.com/learnova"],
    }),
  },
};

// viewport removed from metadata
export const viewport = {
width: "device-width",
initialScale: 1,
maximumScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`font-sans ${geistSans.variable} ${geistMono.variable} antialiased text-white bg-slate-950`}
      >
        <AuthProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
