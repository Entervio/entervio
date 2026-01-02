import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  MessageSquare, 
  Star, 
  Quote, 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "~/lib/utils";
import { InterviewContext } from "~/components/InterviewContext";
import { useFeedbackStore } from "~/services/usefeedbackstore";
import { useParams } from "react-router";

interface QuestionAnswer {
  id: number;
  question: string;
  answer: string | null;
  response_example: string | null;
  grade: number | null;
  feedback: string | null;
}

interface InterviewSummary {
  score: number;
  strengths: string[];
  weaknesses: string[];
  tips: string[];
  overall_comment: string;
  questions: QuestionAnswer[];
}

interface InterviewContextData {
  job_description?: string;
  interviewer_style?: string;
}

interface FeedbackContentProps {
  summary: InterviewSummary | null;
  loading: boolean;
  error: string | null;
  interviewContext?: InterviewContextData | null;
}

function QuestionCard({ qa, index, interviewId }: { qa: QuestionAnswer; index: number; interviewId: string }) {
  const [showExample, setShowExample] = useState(false);
  const { generateExampleResponse, generatingExampleForQuestion } = useFeedbackStore();
  
  const isGenerating = generatingExampleForQuestion === qa.id;
  const hasExample = !!qa.response_example;

  const handleGenerateExample = async () => {
    await generateExampleResponse(interviewId, qa.id);
    // Auto-expand after successful generation
    setShowExample(true);
  };

  return (
    <Card
      className="group overflow-hidden border-border hover:border-primary/30 transition-all duration-500 hover:shadow-(--shadow-diffuse) bg-card"
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
          {qa.grade !== null && (
            <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-full border border-border shadow-sm shrink-0 group-hover:scale-105 transition-transform duration-300">
              <Star className={cn("h-5 w-5", qa.grade >= 8 ? "text-emerald-500 fill-emerald-500" : qa.grade >= 5 ? "text-amber-500 fill-amber-500" : "text-red-500 fill-red-500")} />
              <span className="text-lg font-bold text-foreground">{qa.grade}</span>
              <span className="text-sm text-muted-foreground font-medium">/10</span>
            </div>
          )}
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
            {qa.answer ? `"${qa.answer}"` : <span className="text-muted-foreground">Pas de réponse fournie</span>}
          </p>
        </div>

        {/* Example Response Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Réponse exemple IA
            </h4>
            
            {!hasExample ? (
              <Button
                onClick={handleGenerateExample}
                disabled={isGenerating}
                size="sm"
                variant="outline"
                className="gap-2 hover:bg-secondary hover:border-secondary hover:text-secondary-foreground transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Générer un exemple
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => setShowExample(!showExample)}
                size="sm"
                variant="ghost"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                {showExample ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Masquer
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Voir l'exemple
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Collapsible Example Content */}
          {hasExample && showExample && (
            <div className="bg-secondary/30 rounded-2xl p-6 border border-secondary/40 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-secondary rounded-lg shrink-0">
                  <Sparkles className="h-4 w-4 text-secondary-foreground" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    Voici un exemple de réponse professionnelle adaptée à votre profil :
                  </p>
                  <p className="text-foreground/90 leading-relaxed italic">
                    "{qa.response_example}"
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI Feedback */}
        {qa.feedback && (
          <div className="bg-secondary/10 rounded-2xl p-6 border border-secondary/20">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-secondary-foreground" />
              <h4 className="text-sm font-bold text-secondary-foreground uppercase tracking-widest">
                Analyse & Conseils
              </h4>
            </div>
            <p className="text-foreground/90 leading-relaxed">
              {qa.feedback}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FeedbackContent({ summary, loading, error, interviewContext }: FeedbackContentProps) {
  const { interviewId } = useParams();

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

      {/* Interview Context Section */}
      {interviewContext && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
          <InterviewContext data={interviewContext} collapsible={true} />
        </div>
      )}

      {/* Global Score & Summary */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Score Card */}
        <Card className="md:col-span-1 border-border shadow-(--shadow-diffuse) bg-card overflow-hidden relative group flex flex-col items-center justify-center p-6">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">Score Global</div>
            <div className="flex items-baseline gap-1">
              <span className={cn("text-6xl font-bold font-serif", summary.score >= 8 ? "text-emerald-600" : summary.score >= 5 ? "text-amber-600" : "text-red-600")}>
                {summary.score.toFixed(1)}
              </span>
              <span className="text-2xl text-muted-foreground font-light">/10</span>
            </div>
            <div className="mt-4 flex gap-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className={cn("w-1.5 h-8 rounded-full transition-all", i < Math.round(summary.score) ? (summary.score >= 8 ? "bg-emerald-500" : summary.score >= 5 ? "bg-amber-500" : "bg-red-500") : "bg-muted")} />
              ))}
            </div>
          </div>
        </Card>

        {/* Overall Comment */}
        <Card className="md:col-span-2 border-border shadow-(--shadow-diffuse) bg-card overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Quote className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl font-serif font-medium">Synthèse</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-foreground/80 leading-relaxed font-light italic">
              "{summary.overall_comment}"
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Strengths */}
        <Card className="border-border shadow-sm bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <CardTitle className="text-lg font-medium">Points Forts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {summary.strengths.length > 0 ? (
              <ul className="space-y-3">
                {summary.strengths.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground/80">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucun point fort identifié</p>
            )}
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card className="border-border shadow-sm bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg font-medium">À Améliorer</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {summary.weaknesses.length > 0 ? (
              <ul className="space-y-3">
                {summary.weaknesses.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground/80">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucun point d'amélioration identifié</p>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-border shadow-sm bg-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg font-medium">Conseils</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {summary.tips.length > 0 ? (
              <ul className="space-y-3">
                {summary.tips.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground/80">
                    <Lightbulb className="h-5 w-5 text-blue-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucun conseil disponible</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Questions */}
      <div className="space-y-8 pt-8">
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-serif font-medium">Détails par question</h2>
        </div>

        <div className="grid gap-8">
          {summary.questions.map((qa, index) => (
            <QuestionCard 
              key={qa.id} 
              qa={qa} 
              index={index}
              interviewId={interviewId!}
            />
          ))}
        </div>
      </div>
    </div>
  );
}