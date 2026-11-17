import { createFileRoute } from "@tanstack/react-router";
import { handleLoop } from "@/lib/mpp/http.server";

export const Route = createFileRoute("/api/mpp/loop")({
  server: { handlers: { POST: ({ request }) => handleLoop(request) } },
});
