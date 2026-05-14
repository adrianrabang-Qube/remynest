"use client";

import {
  acceptInvite,
  declineInvite,
} from "@/app/(app)/dashboard/actions";

interface PendingInvitesProps {
  invites: any[];
}

export default function PendingInvites({
  invites,
}: PendingInvitesProps) {
  if (!invites?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border p-6 bg-white shadow-sm">
      <h2 className="text-2xl font-semibold mb-4">
        Pending Invites
      </h2>

      <div className="space-y-4">
        {invites.map((invite: any) => (
          <div
            key={invite.id}
            className="border rounded-xl p-4"
          >
            <h3 className="font-semibold text-lg">
              {
                invite.memory_profiles
                  ?.profile_name
              }
            </h3>

            <p className="text-gray-600">
              Relationship:{" "}
              {invite.relationship_type}
            </p>

            <p className="text-gray-600">
              Access: {invite.access_level}
            </p>

            <div className="flex gap-3 mt-4">
              <form action={acceptInvite}>
                <input
                  type="hidden"
                  name="invite_id"
                  value={invite.id}
                />

                <button
                  type="submit"
                  className="rounded-lg bg-black text-white px-4 py-2"
                >
                  Accept
                </button>
              </form>

              <form action={declineInvite}>
                <input
                  type="hidden"
                  name="invite_id"
                  value={invite.id}
                />

                <button
                  type="submit"
                  className="rounded-lg border px-4 py-2"
                >
                  Decline
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}