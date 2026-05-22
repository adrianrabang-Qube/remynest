import InviteCaregiverForm from "@/components/InviteCaregiverForm";

type ActiveProfile = {
  id: string;
  profile_name?: string | null;
  preferred_name?: string | null;
  shared?: boolean | null;
  access_level?: string | null;
  relationship_type?: string | null;
};

type DashboardProfilePanelProps = {
  activeProfile: ActiveProfile | null;
};

export default function DashboardProfilePanel({
  activeProfile,
}: DashboardProfilePanelProps) {

  if (!activeProfile) {
    return null;
  }

  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">

      <h2 className="text-2xl font-semibold mb-6 text-[#2f3e34]">
        Active Profile
      </h2>

      <div className="border rounded-3xl p-6 bg-[#faf8f4]">

        <h3 className="text-3xl font-semibold mb-3 text-[#2f3e34]">
          {activeProfile.profile_name}
        </h3>

        <p className="text-gray-600 mb-5">
          Preferred Name:{" "}
          {activeProfile.preferred_name || "Not set"}
        </p>

        {activeProfile.shared && (

          <div className="space-y-2 mb-6">

            <p className="text-gray-600">
              Access Level:{" "}
              {activeProfile.access_level || "Unknown"}
            </p>

            <p className="text-gray-600">
              Relationship:{" "}
              {activeProfile.relationship_type || "Unknown"}
            </p>

            <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-4 py-2 text-sm font-medium">
              Shared With You
            </span>

          </div>
        )}

        <InviteCaregiverForm
          memoryProfileId={
            activeProfile.id
          }
        />

      </div>

    </div>
  );
}