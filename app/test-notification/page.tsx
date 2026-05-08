"use client";

export default function TestNotificationPage() {
  async function sendTestNotification() {
    const res = await fetch(
      "/api/send-reminder",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          title: "RemyNest Reminder",

          message:
            "Your AI reminder system is working.",

          external_user_id:
            "test-user",
        }),
      }
    );

    const data = await res.json();

    console.log(data);

    alert("Notification request sent");
  }

  return (
    <div className="p-10">
      <button
        onClick={sendTestNotification}
        className="bg-black text-white px-6 py-3 rounded-xl"
      >
        Send Test Notification
      </button>
    </div>
  );
}