import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: ["/track", "/t", "/api/track", "/admin", "/login"] }] };
}
