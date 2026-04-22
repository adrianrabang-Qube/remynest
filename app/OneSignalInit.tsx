'use client'

import { useEffect } from 'react'

export default function OneSignalInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    console.log('🚀 OneSignalInit mounted')

    const interval = setInterval(() => {
      if (window.OneSignal) {
        clearInterval(interval)

        console.log('🚀 OneSignal found, initializing...')

        window.OneSignal = window.OneSignal || []

        window.OneSignal.push(async function () {
          await window.OneSignal.init({
            appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
            allowLocalhostAsSecureOrigin: true,
          })

          console.log('✅ OneSignal READY')

          // ✅ NEW WORKING WAY (v16)
          const id = window.OneSignal.User.PushSubscription.id

          console.log('🆔 OneSignal ID:', id)

          // 🔥 SEND TO SUPABASE
          await fetch('/api/save-onesignal', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: '969c8736-0a74-4012-a541-0c741bf538df',
              onesignal_id: id,
            }),
          })

          console.log('💾 Saved to DB')
        })
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return null
}