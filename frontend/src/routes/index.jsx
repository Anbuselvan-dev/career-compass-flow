import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/features/auth/AppShell";

export const Route = createFileRoute("/")({
  component: AppShell,
});
