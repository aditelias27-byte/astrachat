import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: { default: 'AstraChat — Chat AI Multi-Model', template: '%s | AstraChat' },
  description: 'Satu website untuk banyak model AI: GPT, Claude, Gemini, DeepSeek, Qwen, Kimi — semua lewat satu gateway.',
}

export const viewport: Viewport = { themeColor: '#a855f7', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
