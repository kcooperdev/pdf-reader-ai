import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF Reader AI",
  description: "Ask questions about your PDF using AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
