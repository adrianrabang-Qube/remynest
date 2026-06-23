import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RemyNest",
    short_name: "RemyNest",
    description: "Capture memories and ask Remy about your people, reminders, and life story.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F1EA",
    theme_color: "#4F6B5B",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}