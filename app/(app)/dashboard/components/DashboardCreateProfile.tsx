import CreateProfileForm from "@/components/CreateProfileForm";

export default function DashboardCreateProfile() {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">

      <h2 className="text-2xl font-semibold mb-2 text-[#2f3e34]">
        Create Care Profile
      </h2>

      <p className="text-gray-500 mb-5">
        Create a new memory care
        profile for yourself or a
        loved one.
      </p>

      <CreateProfileForm />

    </div>
  );
}