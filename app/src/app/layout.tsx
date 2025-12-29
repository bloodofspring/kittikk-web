import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { type ReactNode } from 'react'
import './legacy.css'
import './globals.css'

const nameFont = localFont({
  src: '../shared/assets/fonts/nameFont.woff2',
  variable: '--font-name',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'KiTTiKk - Home',
  description: 'Запости эту кошку когда они будут меньше всего этого ожидать',
}

const RootLayout = ({
  children,
}: Readonly<{
  children: ReactNode
}>) => (
  <html lang="en">
    <body className={`${nameFont.variable}`}>{children}</body>
  </html>
)

export default RootLayout
