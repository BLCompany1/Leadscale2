import "./globals.css"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard de Performance',
  description: 'Gerenciamento de Meta Ads',
  icons: {
    icon: '/logo-empresa.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-br">
      <head>
        <link rel="icon" href="/logo-empresa.png" type="image/png" />
      </head>
      <body className="bg-[#0a051a]" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}