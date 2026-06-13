import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

import { RatingsProvider } from "@/context/RatingsContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BADGER SHEILD | Luxury Clothing",
  description: "Minimalist luxury t-shirts and clothing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased flex flex-col`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <RatingsProvider>
            <Navbar />
            <main className="flex-1 w-full">
              {children}
            </main>
            <Footer />
            <Toaster />
          </RatingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
