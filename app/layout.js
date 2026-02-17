import "./globals.css";

export const metadata = {
  title: "Connect Four",
  description: "Play Connect Four online with friends",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  themeColor: "#0a0a1a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Connect Four",
  },
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
