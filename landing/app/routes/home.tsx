import type { Route } from "./+types/home";
import LandingPage from "~/components/landing-page";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Entervio" },
    { name: "description", content: "Votre copilote carrière IA pour réussir vos entretiens et décrocher le job de vos rêves." },
  ];
}

export default function Home() {
  return <LandingPage></LandingPage>;
}
