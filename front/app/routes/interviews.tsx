import { useEffect } from "react";
import { useParams, Link, Outlet } from "react-router";
import type { Route } from "./+types/interviews";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { FileText, ArrowRight, Calendar, Star, User } from "lucide-react";
import { useInterviewListStore } from "~/services/interview-list-store";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mes entretiens - Entervio" },
    { name: "description", content: "Historique de vos entretiens" },
  ];
}

const INTERVIEWER_STYLE_LABELS: Record<string, string> = {
  nice: "Bienveillant",
  neutral: "Neutre",
  mean: "Strict",
};

export default function Interviews() {
  const { interviews, loading, error, fetchInterviews } = useInterviewListStore();
  const { interviewId } = useParams();

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 7) return "text-green-600 bg-green-50 border-green-200";
    if (grade >= 5) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-16">
        <div className="text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">
              Erreur
            </h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button asChild variant="outline">
              <Link to="/setup">Retour à l'accueil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Mes entretiens
          </h1>
          <p className="text-xl text-muted-foreground">
            Consultez l'historique de vos sessions
          </p>
        </div>
        <Card className="border-border/60 bg-card/50 backdrop-blur-sm shadow-xl shadow-black/5 overflow-hidden">
          <CardContent className="py-24 text-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-inner shadow-primary/5">
                <FileText className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Aucun entretien pour le moment
              </h2>
              <p className="text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed text-lg">
                Commencez votre premier entretien pour voir votre historique et suivre votre progression.
              </p>
              <Button asChild size="lg" className="h-12 px-8 shadow-lg shadow-primary/20">
                <Link to="/setup">
                  Démarrer un nouvel entretien
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
          Mes entretiens
        </h1>
        <p className="text-muted-foreground text-lg">
          Consultez et analysez vos entretiens passés
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left sidebar - Interview list */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          <div className="space-y-3 lg:sticky lg:top-6">
            {interviews.map((interview) => (
              <Link
                key={interview.id}
                to={`/interviews/${interview.id}`}
              >
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md my-2 ${
                    interviewId === String(interview.id)
                      ? "border-primary shadow-md bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="line-clamp-1">
                          {formatDate(interview.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="font-normal">
                        <User className="h-3 w-3 mr-1" />
                        {INTERVIEWER_STYLE_LABELS[interview.interviewer_style] || interview.interviewer_style}
                      </Badge>
                      
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded-full border ${getGradeColor(
                          interview.grade
                        )}`}
                      >
                        <Star className="h-3 w-3 fill-current" />
                        <span className="font-bold text-sm">
                          {interview.grade.toFixed(1)}
                        </span>
                        <span className="text-xs">/10</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {interview.question_count} question{interview.question_count > 1 ? "s" : ""}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            <Button asChild variant="outline" className="w-full mt-2">
              <Link to="/setup">
                <ArrowRight className="w-4 h-4 mr-2" />
                Nouvel entretien
              </Link>
            </Button>
          </div>
        </div>

        {/* Right content - Interview details */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9">
          <Outlet />
        </div>
      </div>
    </div>
  );
}