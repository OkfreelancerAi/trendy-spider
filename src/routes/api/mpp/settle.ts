import { createFileRoute } from "@tanstack/react-router";
import { handleSettle } from "@/lib/mpp/pay.server";

export const Route = createFileRoute("/api/mpp/settle")({
  server: { handlers: { POST: ({ request }) => handleSettle(request) } },
});
