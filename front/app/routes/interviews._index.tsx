import type { Route } from "./+types/interviews._index";
import { Card, CardContent } from "~/components/ui/card";
import { FileText } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mes entretiens - Entervio" },
    { name: "description", content: "Historique de vos entretiens" },
  ];
}

export default function InterviewsIndex() {
  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur-sm shadow-sm">
      <CardContent className="py-24 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Sélectionnez un entretien
        </h2>
        <p className="text-muted-foreground">
          Choisissez un entretien dans la liste pour voir les détails
        </p>
      </CardContent>
    </Card>
  );
}