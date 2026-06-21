import UIKit
import Capacitor
import WebKit
import OneSignalFramework
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKScriptMessageHandler, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    /// Guards one-time registration of the WebView → native message handler.
    private var oneSignalBridgeRegistered = false

    /// Message-handler name the WebView posts to (`window.webkit.messageHandlers.oneSignalBridge`).
    private static let bridgeName = "oneSignalBridge"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // --- Foreground presentation of LOCAL reminders --------------------------
        // Register our UNUserNotificationCenter delegate BEFORE OneSignal.initialize so
        // OneSignal's notification-center swizzling forwards non-OneSignal (local)
        // notifications to our willPresent. Without a pre-init delegate, OneSignal owns
        // the foreground path and on-device reminders are silently suppressed while the
        // app is active. Capacitor still installs its own delegate later for taps/deep
        // links, and OneSignal push is unaffected (it swizzles regardless of init order).
        UNUserNotificationCenter.current().delegate = self

        // --- Native OneSignal (APNs) initialization ------------------------------
        // RemyNest's web app runs inside a remote-URL WKWebView, where the OneSignal
        // *Web* SDK cannot create an iOS push subscription. Initializing the *native*
        // SDK here registers the device with APNs and creates the iOS subscription
        // that reminder pushes (external_id targeting) deliver to. OneSignal swizzles
        // the APNs delegate callbacks, so no manual registerForRemoteNotifications
        // wiring is required here.
        if let appId = Self.oneSignalAppId() {
            OneSignal.initialize(appId, withLaunchOptions: launchOptions)
            OneSignal.Notifications.requestPermission({ _ in }, fallbackToSettings: true)
        } else {
            NSLog("[OneSignal] ONESIGNAL_APP_ID missing/placeholder in Info.plist — native push disabled")
        }
        return true
    }

    // MARK: - UNUserNotificationCenterDelegate (foreground presentation)

    /// Present LOCAL reminders (interval/calendar triggers) as banner + sound + badge +
    /// notification-center entry while the app is active. Remote OneSignal/APNs pushes
    /// (UNPushNotificationTrigger) are left to OneSignal's own handling so existing
    /// OneSignal foreground behavior is unchanged.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        if notification.request.trigger is UNPushNotificationTrigger {
            completionHandler([])
        } else {
            completionHandler([.banner, .list, .sound, .badge])
        }
    }

    /// The (public, non-secret) OneSignal App ID from Info.plist; nil if unset/placeholder.
    private static func oneSignalAppId() -> String? {
        guard let id = Bundle.main.object(forInfoDictionaryKey: "ONESIGNAL_APP_ID") as? String,
              !id.isEmpty, id != "REPLACE_WITH_ONESIGNAL_APP_ID" else { return nil }
        return id
    }

    // --- Identity bridge (WebView → native) --------------------------------------
    // The Supabase session lives in the WebView. After auth, the web app posts the
    // user id to `oneSignalBridge`; we forward it to OneSignal.login so the iOS
    // subscription carries the same external_id the reminder sender targets. Logout
    // clears it. By didBecomeActive the Capacitor WebView exists; registration is
    // idempotent and the web side retries until the handler is present.
    func applicationDidBecomeActive(_ application: UIApplication) {
        registerOneSignalBridgeIfPossible()
    }

    private func registerOneSignalBridgeIfPossible() {
        guard !oneSignalBridgeRegistered, let webView = bridgeWebView() else { return }
        webView.configuration.userContentController.add(self, name: Self.bridgeName)
        oneSignalBridgeRegistered = true
    }

    /// The Capacitor WebView from the root view controller (handles nav/tab wrappers).
    private func bridgeWebView() -> WKWebView? {
        var vc = window?.rootViewController
        if let nav = vc as? UINavigationController { vc = nav.visibleViewController }
        if let tab = vc as? UITabBarController { vc = tab.selectedViewController }
        return (vc as? CAPBridgeViewController)?.webView
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.bridgeName,
              let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }
        switch action {
        case "login":
            if let externalId = body["externalId"] as? String, !externalId.isEmpty {
                OneSignal.login(externalId)
                sendBridgeLoginAck(externalId: externalId)
            }
        case "logout":
            OneSignal.logout()
        default:
            break
        }
    }

    /// Acknowledge a completed bridge login back to the web layer so it can confirm
    /// the native `OneSignal.login` actually executed (the web's
    /// `window.__oneSignalBridgeAck`). The web flips its identity state from
    /// "requested" to "confirmed" on receipt; older builds without this simply keep
    /// re-posting login on auth events — harmless and idempotent.
    private func sendBridgeLoginAck(externalId: String) {
        guard let webView = bridgeWebView() else { return }
        // externalId is a server-issued UUID; strip quotes/backslashes defensively
        // before interpolating into the JS string literal.
        let safe = externalId
            .replacingOccurrences(of: "\\", with: "")
            .replacingOccurrences(of: "\"", with: "")
        let js = "window.__oneSignalBridgeAck && window.__oneSignalBridgeAck({ externalId: \"\(safe)\", status: \"ok\" });"
        DispatchQueue.main.async {
            webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {}

    func applicationDidEnterBackground(_ application: UIApplication) {}

    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
