'use client'

import { useEffect } from 'react'

export default function OneSignalInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const initOneSignal = async () => {
      const OneSignal = (window as any).OneSignal || []

      OneSignal.push(async function () {
        await OneSignal.init({
          appId: '0783b302-cb5a-474a-9f28-79869c2c0e03',
        })
      })
    }

    initOneSignal()
  }, [])

  return null
}