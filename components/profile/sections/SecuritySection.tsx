export default function SecuritySection() {
  return (
    <div className="space-y-3 text-sm">

      <div className="rounded-lg border p-3">
        <h5 className="font-medium">
          Password & Authentication
        </h5>

        <p className="mt-1 text-neutral-500">
          Manage password, authentication methods,
          and account protection.
        </p>
      </div>

      <div className="rounded-lg border p-3">
        <h5 className="font-medium">
          Privacy Controls
        </h5>

        <p className="mt-1 text-neutral-500">
          Configure privacy preferences, data access,
          and account security settings.
        </p>
      </div>

    </div>
  );
}