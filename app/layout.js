import "./globals.css";

export const metadata = {
  title: "Connect Four",
  description: "Play Connect Four online with friends or challenge the AI — 3 difficulty levels, live scoreboard, no downloads.",
  openGraph: {
    title: "Connect Four — Online Multiplayer",
    description: "Challenge friends online or battle the AI. Retro arcade style, mobile-first, plays in your browser.",
    type: "website",
    siteName: "Connect Four",
  },
  twitter: {
    card: "summary_large_image",
    title: "Connect Four — Online Multiplayer",
    description: "Challenge friends online or battle the AI. Retro arcade style, mobile-first, plays in your browser.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Connect Four",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a1a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#0a0a1a] overflow-hidden">{children}</body>
    </html>
  );
}
