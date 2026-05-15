import type { Metadata } from 'next'
import { Mulish, Inter, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { TPThemeProvider } from '@/components/tp-theme-provider'
import './globals.css'

const mulish = Mulish({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['400', '500', '600', '700', '800'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

// Playfair Display — serif display face used on the Velora login
// headline ("Sign in to Velora"). Loaded via next/font so it ships
// as a stable CSS variable (--font-display) usable anywhere.
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700', '800'],
  style: ['normal', 'italic'],
})


export const metadata: Metadata = {
  title: 'Velora',
  description: 'Velora: a focused clinical AI chat. Patient context, smart cards, and conversational guidance — without the EMR.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${mulish.variable} ${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <TPThemeProvider>
          {children}
          <Analytics />
        </TPThemeProvider>
      </body>
    </html>
  )
}
