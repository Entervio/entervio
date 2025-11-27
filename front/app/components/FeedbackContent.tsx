import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2, MessageSquare, Star } from "lucide-react";

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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-xl text-muted-foreground">Analyse de votre entretien...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-xl text-destructive">Erreur: {error}</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div className="text-xl text-muted-foreground">Aucun feedback disponible</div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Global Feedback */}
      <Card className="border-border shadow-sm bg-card">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-semibold">Feedback Général</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-lg">
            {summary.feedback}
          </p>
        </CardContent>
      </Card>

      {/* Question & Answer Pairs */}
      <div className="space-y-8">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Détails par question
        </h2>

        {summary.questions.map((qa, index) => (
          <Card key={index} className="overflow-hidden border-border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Badge variant="outline" className="mb-2 bg-background font-normal">
                    Question {index + 1}
                  </Badge>
                  <h3 className="text-lg font-medium text-foreground leading-snug">
                    {qa.question}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1 bg-background px-3 py-1 rounded-full border border-border shadow-sm">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-foreground">{qa.grade}</span>
                    <span className="text-xs text-muted-foreground">/10</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Votre réponse
                </h4>
                <div className="p-4 bg-muted/20 rounded-lg border border-border/50 italic text-muted-foreground">
                  "{qa.answer}"
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Analyse & Conseils
                </h4>
                <p className="text-foreground leading-relaxed">
                  {qa.feedback}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}