import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
});

export const metadata: Metadata = {
  title: {
    default: "کتابخانه من",
    template: "%s | کتابخانه من",
  },
  description: "آرشیو شخصی کتاب‌ها — فیزیکی، الکترونیکی و صوتی",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#fbf3df",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="font-sans antialiased">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
