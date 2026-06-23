import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import RemyNestLogo from "@/components/brand/RemyNestLogo";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {

  const supabase =
    await createClient();

  // =====================================
  // AUTH
  // =====================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // =====================================
  // FETCH PROFILE
  // =====================================

  const {
    data: existingProfile,
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // =====================================
  // REDIRECT IF COMPLETE
  // =====================================

  if (
    existingProfile?.onboarding_completed ===
    true
  ) {
    redirect("/home");
  }

  // =====================================
  // COMPLETE ONBOARDING
  // =====================================

  async function completeOnboarding(
    formData: FormData
  ) {
    "use server";

    const supabase =
      await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const firstName =
      formData.get(
        "first_name"
      ) as string;

    const preferredName =
      formData.get(
        "preferred_name"
      ) as string;

    const country =
      formData.get(
        "country"
      ) as string;

    const dateOfBirth =
      formData.get(
        "date_of_birth"
      ) as string;

    const timezone =
      formData.get(
        "timezone"
      ) as string;

    // =====================================
    // VALIDATION
    // =====================================

    if (
      !firstName ||
      firstName.trim().length === 0
    ) {
      throw new Error(
        "First name required"
      );
    }

    // =====================================
    // UPSERT PROFILE
    // =====================================

    const {
      error,
    } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,

          email:
            user.email,

          first_name:
            firstName.trim(),

          preferred_name:
            preferredName?.trim() ||
            firstName.trim(),

          country:
            country?.trim() || null,

          timezone:
            timezone || null,

          date_of_birth:
            dateOfBirth || null,

          onboarding_completed:
            true,
        },
        {
          onConflict: "id",
        }
      );

    console.log(
      "PROFILE UPSERT ERROR:"
    );

    console.log(error);

    if (error) {
      throw new Error(
        error.message
      );
    }

    // =====================================
    // REDIRECT
    // =====================================

    redirect("/home");
  }

  return (
    <div className="min-h-screen bg-sand flex items-center justify-center px-6 py-10">

      <div className="w-full max-w-2xl bg-white rounded-[32px] border border-sand-deep/60 shadow-sm p-8 md:p-10">

        <RemyNestLogo className="mb-8" />

        {/* HEADER */}
        <div className="mb-10">

          <div className="inline-flex items-center rounded-full bg-sand border px-4 py-2 text-sm text-gray-600 mb-6">
            Welcome to RemyNest
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-charcoal mb-4">
            Let’s personalize your experience
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed">
            Help RemyNest create a more
            personal and intelligent
            memory experience tailored
            to you.
          </p>
        </div>

        {/* FORM */}
        <form
          action={
            completeOnboarding
          }
          className="space-y-6"
        >

          {/* FIRST NAME */}
          <div className="space-y-2">

            <label className="text-sm font-medium text-charcoal">
              First Name
            </label>

            <input
              type="text"
              name="first_name"
              placeholder="John"
              required
              className="w-full rounded-2xl border px-5 py-4 outline-none focus:ring-2 focus:ring-sage"
            />
          </div>

          {/* PREFERRED NAME */}
          <div className="space-y-2">

            <label className="text-sm font-medium text-charcoal">
              Preferred Name
            </label>

            <input
              type="text"
              name="preferred_name"
              placeholder="Johnny"
              className="w-full rounded-2xl border px-5 py-4 outline-none focus:ring-2 focus:ring-sage"
            />

            <p className="text-sm text-gray-400">
              This is how RemyNest will
              greet you.
            </p>
          </div>

          {/* COUNTRY */}
          <div className="space-y-2">

            <label className="text-sm font-medium text-charcoal">
              Country
            </label>

            <input
              type="text"
              name="country"
              placeholder="Ireland"
              className="w-full rounded-2xl border px-5 py-4 outline-none focus:ring-2 focus:ring-sage"
            />
          </div>

          {/* DATE OF BIRTH */}
          <div className="space-y-2">

            <label className="text-sm font-medium text-charcoal">
              Date of Birth
            </label>

            <input
              type="date"
              name="date_of_birth"
              className="w-full rounded-2xl border px-5 py-4 outline-none focus:ring-2 focus:ring-sage"
            />
          </div>

          {/* HIDDEN TIMEZONE */}
          <input
            type="hidden"
            name="timezone"
            value={
              Intl.DateTimeFormat()
                .resolvedOptions()
                .timeZone
            }
          />

          {/* TIMEZONE DISPLAY */}
          <div className="rounded-2xl bg-[#f8f8f8] border p-5">

            <p className="text-sm text-gray-500 mb-2">
              Detected Timezone
            </p>

            <p className="font-medium text-charcoal">
              {
                Intl.DateTimeFormat()
                  .resolvedOptions()
                  .timeZone
              }
            </p>
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            className="w-full rounded-2xl bg-sage text-white py-4 text-lg font-medium hover:bg-sage-deep transition"
          >
            Continue to Home
          </button>
        </form>
      </div>
    </div>
  );
}