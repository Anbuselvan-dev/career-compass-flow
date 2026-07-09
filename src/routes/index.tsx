import { createFileRoute } from "@tanstack/react-router";
import { CareerFlow } from "@/features/flow/CareerFlow";

export const Route = createFileRoute("/")({
  component: CareerFlow,
});
