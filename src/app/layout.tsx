import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trip Pocket",
  description: "가고 싶은 여행지를 저장하고 여행 계획을 관리해 보세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
