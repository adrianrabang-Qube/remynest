# App Permissions Inventory & Justifications

For each permission: the **reason** it is needed, the **user-facing explanation**
(the runtime prompt / purpose string the user sees), and the **App Store / Play
reviewer explanation**. Request each permission **only at the moment of use** (just-in-time),
never at launch. RemyNest requests the minimum permissions necessary and does not request
location, contacts, or health permissions.

---

## 1. Camera

- **Reason:** Allow users to capture a photo or video to add directly to a memory.
- **User-facing explanation (iOS `NSCameraUsageDescription`):**
  > "RemyNest uses your camera so you can capture photos and videos to add to your memories."
- **Android:** `android.permission.CAMERA` — requested at the point the user chooses
  "take a photo/video."
- **App Store / Play reviewer explanation:**
  > The camera is used solely to let the user capture new photos or videos to save as
  > memories within their own account. Access is requested just-in-time when the user
  > taps the capture action. Captured media is stored only in the user's account; it is
  > not shared with third parties or used for tracking or advertising.

## 2. Photo Library

- **Reason:** Allow users to select existing photos/videos to add to memories, and (when
  saving) to export media back to their library.
- **User-facing explanation (iOS `NSPhotoLibraryUsageDescription` /
  `NSPhotoLibraryAddUsageDescription`):**
  > "RemyNest needs access to your photo library so you can add existing photos and
  > videos to your memories." / "RemyNest needs permission to save photos and videos to
  > your library."
- **Android:** Uses the **Android Photo Picker** / scoped media access where possible
  (no broad storage permission); on older APIs, `READ_MEDIA_IMAGES` /
  `READ_MEDIA_VIDEO`.
- **App Store / Play reviewer explanation:**
  > Photo library access lets users choose their own existing photos/videos to preserve
  > as memories, and optionally save media they create. We use the system photo picker
  > where available to limit access to user-selected items. Media is confined to the
  > user's account and never used for tracking or advertising.

## 3. Notifications (Push)

- **Reason:** Deliver reminders and alerts the user has enabled (e.g., memory prompts,
  account/security notices) via OneSignal.
- **User-facing explanation (runtime prompt rationale):**
  > "Turn on notifications to receive reminders and updates about your memories. You can
  > change this anytime in settings."
- **iOS:** standard push authorization prompt. **Android 13+:** `POST_NOTIFICATIONS`
  runtime permission, requested in context.
- **App Store / Play reviewer explanation:**
  > Notifications are used only for user-enabled reminders and important account/service
  > messages. They are opt-in, can be disabled in-app or in device settings, and are not
  > used for advertising or third-party marketing. Push tokens are processed by our
  > notification provider (OneSignal) solely to deliver these notifications.

## 4. Files / Storage

- **Reason:** Save and access user content/media and allow data export/download.
- **User-facing explanation:**
  > "RemyNest needs access to save and open your memory files and exports on this device."
- **Android:** Prefer **scoped storage** and the Storage Access Framework / Photo
  Picker; avoid `MANAGE_EXTERNAL_STORAGE` (broad-access permission triggers Play's
  All-files-access policy and declaration). **iOS:** uses the document picker / app
  sandbox; no broad filesystem permission.
- **App Store / Play reviewer explanation:**
  > File access is limited to handling the user's own memory media and to exporting their
  > data on request (data portability). We use scoped, user-mediated pickers rather than
  > broad device storage access. No background scanning of device files occurs.

## 5. Microphone (FUTURE — voice recordings/transcription)

- **Reason:** Allow users to record voice memories and (optionally) transcribe them.
- **User-facing explanation (iOS `NSMicrophoneUsageDescription`):**
  > "RemyNest uses your microphone so you can record voice memories. Recording only
  > happens when you start it."
- **Android:** `android.permission.RECORD_AUDIO`, requested just-in-time when the user
  starts a recording.
- **App Store / Play reviewer explanation:**
  > The microphone will be used solely for user-initiated voice recordings saved to the
  > user's memories, and for optional transcription of those recordings. Recording is
  > explicit and user-started; there is no background or passive listening. Audio is
  > stored in the user's account and not used for tracking or advertising. *(Do not
  > include this permission/usage string until the feature ships; unused permission
  > strings can cause review questions.)*

---

## Permissions NOT requested (declare absence to reviewers if asked)
Location, Contacts/Address Book, Calendar, Health/HealthKit/Google Fit, Bluetooth,
Background location, SMS/Call logs, Advertising ID (IDFA/AAID). RemyNest collects **no**
advertising identifier and shows **"Data Not Used to Track You."**

## Implementation reminders
- iOS: add only the usage strings for features that are live; an empty/placeholder usage
  string is a rejection risk.
- Android 13+: include `POST_NOTIFICATIONS`; use Photo Picker + scoped media;
  avoid all-files access.
- Always request at point-of-use with a clear in-context pre-prompt explaining the
  benefit before showing the system dialog.
