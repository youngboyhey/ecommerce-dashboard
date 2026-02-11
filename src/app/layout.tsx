import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CarMall Dashboard | 電商數據儀表板",
  description: "車魔商城電商數據分析儀表板 - Meta 廣告、GA4、Cyberbiz 營收追蹤",
  keywords: ["電商", "Dashboard", "Meta 廣告", "GA4", "數據分析"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
