import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Thread — Personal to-do list",
    short_name: "Thread",
    description: "Your tasks, smaller steps, and plans in one private space.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8f4",
    theme_color: "#2e5947",
    lang: "en",
    icons: [
      { src: "/icons/thread-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/thread-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
