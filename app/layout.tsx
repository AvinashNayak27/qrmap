import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QR Map',
  description: 'QR Map: spread the $QR IRL and add a photo to the map!',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#ffffff',
};
const frame = {
  version: "next",
  imageUrl: "https://qr-map-lime.vercel.app/og.png",
  button: {
    title: "View Map",
    action: {
      type: "launch_frame",
      url: "https://qr-map-lime.vercel.app/",
      name:"View QR Map",
      splashImageUrl: "https://qr-map-lime.vercel.app/logo.png",
      splashBackgroundColor:"#f5f0ec"
    }
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
        <head>
          <meta name="fc:frame" content={JSON.stringify(frame)} />
        </head>
      <body className={`${inter.className} h-full w-full overflow-hidden`}>
        <main className="h-full w-full">
          {children}
        </main>
      </body>
    </html>
  );
}