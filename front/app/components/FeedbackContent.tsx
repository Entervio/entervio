import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2, MessageSquare, Star, Quote, Lightbulb } from "lucide-react";
import { cn } from "~/lib/utils";

interface QuestionAnswer {
  question: string;
  answer: string;
  grade: number;
  feedback: string;
}

interface InterviewSummary {
  feedback: string;
  questions: QuestionAnswer[];
}

interface FeedbackContentProps {
  summary: InterviewSummary | null;
  loading: boolean;
  error: string | null;
}

export function FeedbackContent({ summary, loading, error }: FeedbackContentProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
        <div className="text-2xl font-serif font-medium text-foreground">Analyse de votre performance...</div>
        <p className="text-muted-foreground">Nos agents étudient vos réponses.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in zoom-in-95 duration-500">
        <div className="p-4 bg-destructive/10 rounded-full">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-serif font-medium text-destructive">Une erreur est survenue</h3>
          <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="p-4 bg-muted rounded-full">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="text-xl font-medium text-muted-foreground">Aucun feedback disponible</div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">

      {/* Header Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/20 bg-primary/5 text-primary font-medium">
          Analyse terminée
        </Badge>
        <h1 className="text-4xl md:text-5xl font-serif font-medium text-foreground tracking-tight">
          Votre bilan d'entretien
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Voici une analyse détaillée de vos réponses pour vous aider à progresser.
        </p>
      </div>

      {/* Global Feedback Card */}
      <Card className="border-border shadow-[var(--shadow-diffuse)] bg-card overflow-hidden relative group">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-serif font-medium">Feedback Général</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-lg text-foreground/80 leading-relaxed max-w-none font-light">
            {summary.feedback}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Questions */}
      <div className="space-y-8">
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-serif font-medium">Détails par question</h2>
        </div>

        <div className="grid gap-8">
          {summary.questions.map((qa, index) => (
            <Card
              key={index}
              className="group overflow-hidden border-border hover:border-primary/30 transition-all duration-500 hover:shadow-[var(--shadow-diffuse)] bg-card"
            >
              <CardHeader className="bg-muted/30 pb-6 border-b border-border/40">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <Badge variant="outline" className="bg-background/50 backdrop-blur-sm font-medium text-muted-foreground border-border/60">
                      Question {index + 1}
                    </Badge>
                    <h3 className="text-xl font-medium text-foreground leading-snug font-serif">
                      {qa.question}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-full border border-border shadow-sm shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <Star className={cn("h-5 w-5", qa.grade >= 8 ? "text-emerald-500 fill-emerald-500" : qa.grade >= 5 ? "text-amber-500 fill-amber-500" : "text-red-500 fill-red-500")} />
                    <span className="text-lg font-bold text-foreground">{qa.grade}</span>
                    <span className="text-sm text-muted-foreground font-medium">/10</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-8 space-y-8">
                {/* User Answer */}
                <div className="relative pl-6 border-l-2 border-primary/20">
                  <Quote className="absolute -left-3 -top-3 h-6 w-6 text-primary/20 bg-card p-1 rounded-full" />
                  <h4 className="text-xs font-bold text-primary/60 uppercase tracking-widest mb-3">
                    Votre réponse
                  </h4>
                  <p className="text-foreground/80 italic leading-relaxed">
                    "{qa.answer}"
                  </p>
                </div>

                {/* AI Feedback */}
                <div className="bg-secondary/10 rounded-2xl p-6 border border-secondary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-emerald-600" />
                    <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-widest">
                      Analyse & Conseils
                    </h4>
                  </div>
                  <p className="text-foreground/90 leading-relaxed">
                    {qa.feedback}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}