import { Outlet } from "react-router";
import type { Route } from "./+types/interviews";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Mes entretiens - Entervio" },
    { name: "description", content: "Historique de vos entretiens" },
  ];
}

export default function InterviewsLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}