import { createFileRoute } from "@tanstack/react-router";
import { handleLook, handleShopGet } from "@/lib/mpp/http.server";

export const Route = createFileRoute("/api/mpp/shop")({
  server: {
    handlers: {
      GET: () => handleShopGet(),
      POST: ({ request }) => handleLook(request),
    },
  },
});
