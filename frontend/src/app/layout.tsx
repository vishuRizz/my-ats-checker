import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATS Checker — See What the ATS Actually Sees",
  description:
    "Upload your resume and instantly see what an ATS parser actually extracts. Get a transparent score, keyword match analysis, and actionable fixes — no magic numbers, no guesswork.",
  keywords: "ATS checker, resume parser, ATS score, resume analyzer, job application, keyword match",
  openGraph: {
    title: "ATS Checker — See What the ATS Actually Sees",
    description: "Transparent resume parsing and ATS analysis. Know exactly why you're not getting callbacks.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
