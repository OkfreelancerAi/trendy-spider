import { createFileRoute } from "@tanstack/react-router";
import { handleListings } from "@/lib/mpp/http.server";

export const Route = createFileRoute("/api/mpp/listings")({
  server: { handlers: { POST: ({ request }) => handleListings(request) } },
});
