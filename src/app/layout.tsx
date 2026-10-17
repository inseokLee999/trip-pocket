import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Trip Pocket | 나만의 여행 보관함",
  description: "가고 싶은 여행지를 저장하고 방문 계획과 추억을 한곳에서 관리하세요.",
  openGraph: {
    title: "Trip Pocket | 나만의 여행 보관함",
    description: "가고 싶은 여행지를 저장하고 방문 계획과 추억을 한곳에서 관리하세요.",
    images: [{ url: "/og.png", width: 1730, height: 909, alt: "Trip Pocket 여행 보관함" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trip Pocket | 나만의 여행 보관함",
    description: "가고 싶은 여행지를 저장하고 방문 계획과 추억을 한곳에서 관리하세요.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
