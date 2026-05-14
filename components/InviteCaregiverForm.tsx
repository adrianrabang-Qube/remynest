"use client";

import { useState, useTransition } from "react";
import { inviteCaregiver } from "@/app/(app)/dashboard/actions";

interface InviteCaregiverFormProps {
  memoryProfileId: string;
}

export default function InviteCaregiverForm({
  memoryProfileId,
}: InviteCaregiverFormProps) {
  const [email, setEmail] = useState("");
  const [relationshipType, setRelationshipType] =
    useState("caregiver");

  const [accessLevel, setAccessLevel] =
    useState("full");

  const [message, setMessage] = useState("");

  const [isPending, startTransition] =
    useTransition();

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setMessage("");

    startTransition(async () => {
      try {
        const result =
          await inviteCaregiver({
            email,
            relationshipType,
            accessLevel,
            memoryProfileId,
          });

        if (result?.error) {
          setMessage(result.error);
          return;
        }

        setMessage(
          "✅ Caregiver invited successfully"
        );

        setEmail("");
      } catch (err) {
        console.error(err);

        setMessage(
          "❌ Failed to invite caregiver"
        );
      }
    });
  }

  return (
    <div className="mt-4 rounded-xl border p-4 bg-gray-50">
      <h3 className="font-semibold mb-4">
        Invite Caregiver
      </h3>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          type="email"
          placeholder="Caregiver email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          className="w-full rounded-lg border px-4 py-2"
          required
        />

        <select
          value={relationshipType}
          onChange={(e) =>
            setRelationshipType(
              e.target.value
            )
          }
          className="w-full rounded-lg border px-4 py-2"
        >
          <option value="caregiver">
            Caregiver
          </option>

          <option value="family">
            Family
          </option>

          <option value="doctor">
            Doctor
          </option>
        </select>

        <select
          value={accessLevel}
          onChange={(e) =>
            setAccessLevel(e.target.value)
          }
          className="w-full rounded-lg border px-4 py-2"
        >
          <option value="read">
            Read Only
          </option>

          <option value="full">
            Full Access
          </option>

          <option value="admin">
            Admin
          </option>
        </select>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-black text-white px-4 py-2"
        >
          {isPending
            ? "Inviting..."
            : "Invite Caregiver"}
        </button>

        {message && (
          <p className="text-sm text-gray-700">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}