import type { Metadata, Viewport } from "next";
import { DM_Sans, Nunito } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travela — Travel smarter. Explore responsibly.",
  description:
    "Find where to go with a clear view of estimated tourism pressure, calmer alternatives and greener routes.",
  applicationName: "Travela",
  appleWebApp: { capable: true, title: "Travela", statusBarStyle: "default" },
  // Declaring `icons` replaces Next's automatic app/icon.png tag, so list the favicon explicitly.
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "64x64" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b3556",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} ${dmSans.variable} antialiased`}>
      <body>
        {/* Phone-width app column; desktop just centers it for development. */}
        <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-sand md:shadow-[0_0_60px_-20px_rgb(11_53_86/0.25)]">
          {children}
        </div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
