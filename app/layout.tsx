import type { Metadata } from "next";
import "./globals.css";
import { ThemeScript } from "@/components/theme-script";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm";

export const metadata: Metadata = {
  title: "Sh.Asharow LMS",
  description: "Sh.Asharow Primary & Secondary School — management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-app-bg text-text">
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
