import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { RegistrarSW } from "@/components/app/registrar-sw";

import "./globals.css";

export const metadata: Metadata = {
  title: "Finanças do Casal",
  description: "As contas de vocês dois no mesmo lugar.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Finanças",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors />
          <RegistrarSW />
        </ThemeProvider>
      </body>
    </html>
  );
}
