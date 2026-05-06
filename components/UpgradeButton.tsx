"use client";

export default function UpgradeButton() {
  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <button
      onClick={handleUpgrade}
      className="bg-black text-white px-4 py-2 rounded-xl"
    >
      Upgrade to Premium
    </button>
  );
}