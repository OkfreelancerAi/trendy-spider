import { createFileRoute } from "@tanstack/react-router";
import { Floor } from "@/components/shop/floor";

export const Route = createFileRoute("/")({ component: Floor });
