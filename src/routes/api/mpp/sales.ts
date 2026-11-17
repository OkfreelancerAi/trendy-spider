import { createFileRoute } from "@tanstack/react-router";
import { handleSales } from "@/lib/mpp/http.server";

export const Route = createFileRoute("/api/mpp/sales")({
  server: { handlers: { POST: ({ request }) => handleSales(request) } },
});
