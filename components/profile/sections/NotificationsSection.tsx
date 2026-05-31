export default function NotificationsSection() {
  return (
    <div className="space-y-3 text-sm">

      <div className="rounded-lg border p-3">
        <h5 className="font-medium">
          Push Notifications
        </h5>

        <p className="mt-1 text-neutral-500">
          Configure reminders, memory alerts,
          and activity notifications.
        </p>
      </div>

      <div className="rounded-lg border p-3">
        <h5 className="font-medium">
          Communication Preferences
        </h5>

        <p className="mt-1 text-neutral-500">
          Manage email updates, reminders,
          and future caregiving communications.
        </p>
      </div>

    </div>
  );
}