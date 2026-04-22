import './globals.css'
import Script from 'next/script'
import OneSignalInit from './OneSignalInit'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log('🔥 LAYOUT RENDERED')

  return (
    <html lang="en">
      <body>
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
        />

        <OneSignalInit />

        {children}
      </body>
    </html>
  )
}