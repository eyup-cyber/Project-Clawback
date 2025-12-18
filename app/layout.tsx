import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import ClientLayoutWrapper from './components/ClientLayoutWrapper';

const kindergarten = localFont({
  src: './fonts/kindergarten.ttf',
  variable: '--font-kindergarten',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://scroungers.media';
const SITE_NAME = 'Scroungers Multimedia';
const SITE_DESCRIPTION =
  'Political journalism from the people who live it. No credentials required. 100% your revenue. Your voice, amplified.';

export const viewport: Viewport = {
  themeColor: '#0D2818',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'political journalism',
    'independent media',
    'citizen journalism',
    'grassroots media',
    'working class voices',
    'benefits system',
    'housing crisis',
    'disability rights',
    'economic justice',
  ],
  authors: [{ name: 'Scroungers Collective' }],
  creator: 'Scroungers Multimedia',
  publisher: 'Scroungers Multimedia',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_GB',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Scroungers Multimedia - Your Voice, Amplified',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
    creator: '@scroungersmedia',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={kindergarten.variable}>
      <head />
      <body>
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
