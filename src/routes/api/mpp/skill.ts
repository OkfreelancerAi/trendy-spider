import { createFileRoute } from "@tanstack/react-router";
import { handleSkill } from "@/lib/mpp/pay.server";

export const Route = createFileRoute("/api/mpp/skill")({
  server: { handlers: { POST: ({ request }) => handleSkill(request) } },
});
