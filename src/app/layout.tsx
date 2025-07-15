import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Track",
  description: "Monitor sua saúde diariamente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <link rel="icon" href="/health-insurance.png" sizes="any" />
      <body>{children}</body>
    </html>
  );
}
