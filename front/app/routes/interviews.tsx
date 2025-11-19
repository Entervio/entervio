import type { Route } from "./+types/interviews";
import { Layout } from "~/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";
import { FileText } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mes entretiens - Entervio" },
    { name: "description", content: "Historique de vos entretiens" },
  ];
}

export default function Interviews() {
  return (
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-secondary mb-4">
            Mes entretiens
          </h1>
          <p className="text-xl text-muted-foreground">
            Consultez l'historique de vos sessions
          </p>
        </div>
        <Card className="border-2 shadow-lg">
          <CardContent className="py-20 text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-secondary mb-3">
              Fonctionnalité à venir
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Vous pourrez bientôt consulter tous vos entretiens passés, revoir vos
              performances et suivre votre progression
            </p>
            <Button asChild size="lg">
              <Link to="/setup">Démarrer un nouvel entretien</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
  );
}