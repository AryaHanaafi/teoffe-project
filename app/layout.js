import './globals.css'
import ClientLayout from '@/components/ClientLayout'
import ToastProvider from '@/components/Toast'

export const metadata = {
  title: 'TEOFFE Admin | A Perfect Blend',
  description: 'Sistem admin penjualan TEOFFE - A Cup of Goodness for Your Daily Life. Semarang, Indonesia.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <ToastProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ToastProvider>
      </body>
    </html>
  )
}
