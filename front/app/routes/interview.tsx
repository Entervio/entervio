import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import type { Route } from "./+types/interview";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { INTERVIEWER_LABELS } from "~/types/interview";
import { cn } from "~/lib/utils";
import { useInterviewStore } from "~/services/useinterviewstore";
import {
  Loader2,
  AlertTriangle,
  MessageSquare,
  User,
  Building2,
  Info,
  Volume2,
  Mic,
  CheckCircle2,
  RotateCcw,
  X,
  StopCircle,
} from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Entretien en cours - Entervio" },
    { name: "description", content: "Entretien d'embauche avec recruteur IA" },
  ];
}

export default function Interview() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get state and actions from store
  const {
    sessionId,
    candidateName,
    interviewerType,
    isRecording,
    isProcessing,
    interviewStarted,
    messages,
    error,
    isPlayingAudio,
    questionCount,
    isLoading,
    loadInterviewData,
    startRecording,
    stopRecording,
    endInterview,
    setError,
    cleanup,
    reset,
  } = useInterviewStore();

  useEffect(() => {
    if (interviewId) {
      loadInterviewData(interviewId).then((success) => {
        if (!success) {
          setTimeout(() => navigate("/"), 2000);
        }
      });
    } else {
      navigate("/");
    }

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [interviewId, navigate, loadInterviewData, cleanup]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEndInterview = async () => {
    await endInterview();
    navigate(`/interview/${sessionId}/feedback`);
  };

  const restartInterview = () => {
    reset();
    navigate("/setup");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-lg font-medium text-muted-foreground">
            Initialisation de l'environnement...
          </p>
        </div>
      </div>
    );
  }

  if (!interviewId || !sessionId || !candidateName) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md border-destructive/20 bg-destructive/5">
          <CardContent className="text-center pt-12 pb-8">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Session introuvable
            </h2>
            <p className="text-muted-foreground mb-8">
              Cette session d'entretien n'existe pas ou a expiré.
            </p>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="rounded-full px-8"
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const interviewerInfo =
    INTERVIEWER_LABELS[interviewerType] || INTERVIEWER_LABELS.neutral;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col font-sans text-foreground selection:bg-primary/20">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-xl ring-1 ring-border/50">
              {interviewerInfo.icon}
            </div>
            <div>
              <h1 className="font-medium text-lg leading-none mb-1 tracking-tight">
                {interviewerInfo.name}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <span className={cn("flex items-center gap-1.5", sessionId ? "text-emerald-500" : "text-muted-foreground")}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", sessionId ? "bg-emerald-500" : "bg-muted-foreground")} />
                  {sessionId ? "En ligne" : "Hors ligne"}
                </span>
                <span className="text-border">•</span>
                <span>Entretien IA</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {interviewStarted && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Progression</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-8 h-1 rounded-full transition-all duration-500",
                        i < questionCount
                          ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]"
                          : "bg-muted/50"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl flex flex-col lg:flex-row gap-12">

        {/* Chat Area */}
        <div className="flex-1 flex flex-col h-[calc(100vh-10rem)] relative">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto pr-4 space-y-8 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-0 animate-in fade-in duration-1000 slide-in-from-bottom-4">
                <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mb-6 ring-1 ring-primary/10">
                  <MessageSquare className="w-10 h-10 text-primary/40" />
                </div>
                <h3 className="text-2xl font-light tracking-tight mb-3">L'entretien va commencer</h3>
                <p className="text-muted-foreground max-w-sm mx-auto text-lg font-light leading-relaxed">
                  Le recruteur prépare sa première question. Installez-vous confortablement.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full animate-in fade-in slide-in-from-bottom-4 duration-500",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn("flex max-w-[85%] lg:max-w-[75%] gap-4", message.role === "user" ? "flex-row-reverse" : "flex-row")}>
                      {/* Avatar */}
                      <div className="shrink-0 mt-1">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-sm shadow-sm ring-1 ring-border/50",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-foreground"
                        )}>
                          {message.role === "user" ? <User className="w-5 h-5" /> : interviewerInfo.icon}
                        </div>
                      </div>

                      {/* Bubble */}
                      <div className={cn(
                        "p-6 rounded-3xl text-[15px] leading-relaxed shadow-sm ring-1",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm ring-primary/50"
                          : "bg-card text-foreground rounded-tl-sm ring-border/50"
                      )}>
                        <p className="whitespace-pre-wrap font-light tracking-wide">
                          {message.text}
                        </p>
                        <span className={cn(
                          "text-[10px] mt-3 block font-medium uppercase tracking-wider opacity-60",
                          message.role === "user" ? "text-primary-foreground" : "text-muted-foreground"
                        )}>
                          {message.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} className="h-4" />
              </>
            )}
          </div>

          {/* Status Bar */}
          {(isPlayingAudio || isProcessing) && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-6 flex items-center gap-3 px-5 py-2.5 rounded-full bg-background/90 backdrop-blur-xl border border-border/50 shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-4">
              {isPlayingAudio ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-foreground/80">Le recruteur parle...</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  <span className="text-foreground/80">Traitement en cours...</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="w-full lg:w-80 space-y-8 pt-4">

          {/* Actions */}
          <div className="space-y-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!sessionId || isProcessing || !interviewStarted || isPlayingAudio}
              className={cn(
                "w-full h-16 text-lg font-medium rounded-2xl shadow-sm transition-all duration-300",
                isRecording
                  ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-destructive/20 ring-4 ring-destructive/10"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5"
              )}
            >
              {isRecording ? (
                <div className="flex items-center gap-3">
                  <StopCircle className="w-6 h-6 fill-current animate-pulse" />
                  <span>Arrêter</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Mic className="w-6 h-6" />
                  <span>{isProcessing ? "Traitement..." : "Répondre"}</span>
                </div>
              )}
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleEndInterview}
                disabled={!sessionId || !interviewStarted || messages.length < 2 || isProcessing}
                variant="outline"
                className="h-12 rounded-xl border-border/50 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Terminer
              </Button>

              {!interviewStarted && messages.length > 0 && (
                <Button
                  onClick={restartInterview}
                  variant="outline"
                  className="h-12 rounded-xl border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Recommencer
                </Button>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="px-6 py-6 rounded-2xl bg-muted/30 border border-border/40">
            <div className="flex items-center gap-2 mb-4 text-foreground/80">
              <Info className="w-4 h-4" />
              <h3 className="font-medium text-sm tracking-wide uppercase">Conseils</h3>
            </div>
            <ul className="space-y-4 text-sm text-muted-foreground font-light leading-relaxed">
              <li className="flex gap-3 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 opacity-60" />
                <span>Prenez le temps d'écouter la question en entier.</span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 opacity-60" />
                <span>Parlez clairement après avoir cliqué sur <strong>Répondre</strong>.</span>
              </li>
              <li className="flex gap-3 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 opacity-60" />
                <span>Soyez concis et structuré dans vos réponses.</span>
              </li>
            </ul>
          </div>

        </div>
      </main>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <Alert variant="destructive" className="shadow-xl max-w-md bg-destructive text-destructive-foreground border-none rounded-xl">
            <AlertDescription className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto h-6 w-6 p-0 hover:bg-black/10 text-current rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}