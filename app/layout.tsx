import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HX-970 Head Unit",
  description: "A late-90s car stereo VFD display, recreated for the web.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/DSEG7Classic-BoldItalic.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/DSEG14Classic-BoldItalic.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
