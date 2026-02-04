import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "NFL QB Trust Meter",
  description: "Crowd-sourced trust ratings for all 32 NFL starting quarterbacks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <header className="sticky top-0 z-50 bg-[var(--card-bg)] border-b border-[var(--card-border)] backdrop-blur-sm bg-opacity-90">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-center">
            <a href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--nfl-blue)] to-[var(--nfl-red)] flex items-center justify-center">
                <span className="text-white font-bold text-lg">🏈</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">NFL QB Trust Meter</h1>
                <p className="text-xs text-gray-400">Crowd-sourced quarterback ratings</p>
              </div>
            </a>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-[var(--card-border)] mt-12 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
            <p>NFL QB Trust Meter - Fan opinions, not official ratings</p>
            <p className="mt-1">Inspired by darnold-meter.com</p>
            <p className="mt-1">Created by Jake Grossman</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
