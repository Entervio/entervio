import type { Route } from "./+types/account";
import { Layout } from "~/components/layout/Layout";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mon compte - Entervio" },
    { name: "description", content: "Paramètres de votre compte" },
  ];
}

export default function Account() {
  return (
    <Layout>
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-secondary mb-4">
            Mon compte
          </h1>
          <p className="text-xl text-muted-foreground">
            Gérez vos informations et préférences
          </p>
        </div>

        <Card className="border-2 shadow-lg">
          <CardContent className="py-20 text-center">
            <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-secondary mb-3">
              Fonctionnalité à venir
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Vous pourrez bientôt personnaliser votre profil, gérer vos préférences et
              consulter vos statistiques
            </p>
            <Button asChild size="lg">
              <Link to="/setup">Commencer un entretien</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}