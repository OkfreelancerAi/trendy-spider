import { createFileRoute } from "@tanstack/react-router";
import { handleDesk } from "@/lib/mpp/http.server";

export const Route = createFileRoute("/api/mpp/desk")({
  server: { handlers: { GET: ({ request }) => handleDesk(request) } },
});
