import type { Metadata, Viewport } from "next";
import "./globals.css";


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Registration Form",
  description: "Register for your favorite college club.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased min-h-screen bg-gray-50 flex items-start sm:items-center justify-center overflow-x-hidden`}
      >
        <main className="w-full max-w-4xl mx-auto py-6 px-3 sm:px-6 lg:px-8 overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
