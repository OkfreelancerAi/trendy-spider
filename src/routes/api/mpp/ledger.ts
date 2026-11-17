import { createFileRoute } from "@tanstack/react-router";
import { handleLedger } from "@/lib/mpp/http.server";

export const Route = createFileRoute("/api/mpp/ledger")({
  server: { handlers: { GET: ({ request }) => handleLedger(request) } },
});
