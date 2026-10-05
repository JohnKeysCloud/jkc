import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { MuseoModerno, Press_Start_2P, Roboto_Mono } from "next/font/google";
import localFont from "next/font/local";
import { site } from "@/content/site";
import "./globals.scss";

const museo = MuseoModerno({
  variable: "--font-museo",
  subsets: ["latin"],
});

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const pixeBoy = localFont({
  variable: "--font-pixe-boy",
  src: "./fonts/pixe-boy.woff2",
});

const description = `${site.handle}: ${site.role.toLowerCase()} at ${site.studio.name}, ${site.location.name}.`;

export const metadata: Metadata = {
  title: `${site.handle} · ${site.mark}`,
  description,
  icons: {
    icon: { url: "/cyclone-favicon.gif", type: "image/gif" },
  },
  openGraph: {
    title: site.handle,
    description,
    type: "website",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#090a0f",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${museo.variable} ${pressStart.variable} ${robotoMono.variable} ${pixeBoy.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
