import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CogniCare Protocol — Member Area",
  description: "Your complete cognitive recovery protocol. Access your content, track your progress, and transform your brain health with the CogniCare 8-week system.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-surface-950">
        {children}
      </body>
    </html>
  );
}
