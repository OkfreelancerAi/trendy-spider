import { createFileRoute } from "@tanstack/react-router";
import { handleDemo } from "@/lib/mpp/http.server";

export const Route = createFileRoute("/api/mpp/demo")({
  server: { handlers: { GET: () => handleDemo() } },
});
