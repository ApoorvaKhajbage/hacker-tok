import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from "@/components/ui/toaster";
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HackerReels',
  description: 'Browse Hacker News stories in a TikTok-style format',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      <Toaster/>
      </body>
    </html>
  )
}