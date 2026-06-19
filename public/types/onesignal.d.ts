export {}

declare global {
  interface OneSignalUser {
    externalId?: string
    PushSubscription?: {
      id?: string
    }
  }

  interface OneSignalNotifications {
    requestPermission(): Promise<void>
  }

  interface OneSignalGlobal {
    init(options: {
      appId: string
      allowLocalhostAsSecureOrigin?: boolean
    }): Promise<void>
    Notifications: OneSignalNotifications
    login(userId: string): Promise<void>
    logout(): Promise<void>
    User?: OneSignalUser
  }

  interface Window {
    OneSignal?: OneSignalGlobal
  }
}