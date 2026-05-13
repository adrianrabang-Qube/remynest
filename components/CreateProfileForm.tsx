"use client";

import { useState } from "react";

import { createProfile } from "@/app/(app)/dashboard/actions";

export default function CreateProfileForm() {
  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    formData: FormData
  ) {
    try {
      setLoading(true);

      await createProfile(formData);

      window.location.reload();
    } catch (err) {
      console.error(err);

      alert("Failed to create profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border p-6 bg-white shadow-sm">
      <h2 className="text-2xl font-semibold mb-6">
        Create Profile
      </h2>

      <form
        action={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium mb-2">
            Profile Name
          </label>

          <input
            type="text"
            name="profile_name"
            required
            placeholder="Grandma Mary"
            className="w-full border rounded-xl p-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Preferred Name
          </label>

          <input
            type="text"
            name="preferred_name"
            placeholder="Mary"
            className="w-full border rounded-xl p-3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Date of Birth
          </label>

          <input
            type="date"
            name="date_of_birth"
            className="w-full border rounded-xl p-3"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-6 py-3 rounded-xl"
        >
          {loading
            ? "Creating..."
            : "Create Profile"}
        </button>
      </form>
    </div>
  );
}