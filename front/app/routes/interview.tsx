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
  CircleDot,
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
    navigate(`/interview/${sessionId}/feedback`)
  };

  const restartInterview = () => {
    reset();
    navigate("/setup");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-lg font-light tracking-wide">
            Chargement de l'entretien...
          </p>
        </div>
      </div>
    );
  }

  if (!interviewId || !sessionId || !candidateName) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="max-w-md text-center space-y-6 p-8 border border-border">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
          <div className="space-y-2">
            <h2 className="text-2xl font-light">Session introuvable</h2>
            <p className="text-muted-foreground">
              Cette session d'entretien n'existe pas ou a expiré.
            </p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline" className="w-full">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const interviewerInfo =
    INTERVIEWER_LABELS[interviewerType] || INTERVIEWER_LABELS.neutral;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-medium uppercase tracking-wider">
                Entretien en cours
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {candidateName}
                </span>
                <span>•</span>
                <span>{interviewerInfo.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  sessionId ? "bg-emerald-500" : "bg-muted"
                )}
              />
              <span className="text-xs font-mono text-muted-foreground">
                {sessionId ? "LIVE" : "OFFLINE"}
              </span>
            </div>

            {interviewStarted && (
              <div className="flex items-center gap-3 pl-4 border-l border-border">
                <span className="text-xs font-mono">
                  Q.{questionCount}/5
                </span>
                {isPlayingAudio && (
                  <span className="flex items-center gap-1 text-xs text-primary animate-pulse">
                    <Volume2 className="w-3 h-3" />
                    Audio
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 grid lg:grid-cols-[1fr_350px] gap-8">
        {/* Chat Area */}
        <div className="flex flex-col h-[calc(100vh-10rem)] border border-border rounded-xl bg-card/50">
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <MessageSquare className="w-12 h-12" />
                <p className="font-light">L'entretien va commencer...</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col max-w-2xl animate-in fade-in slide-in-from-bottom-2",
                    message.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground uppercase tracking-wider">
                    {message.role === "user" ? (
                      <>
                        <span>{candidateName}</span>
                        <User className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        <span>{interviewerInfo.icon}</span>
                        <span>Recruteur</span>
                      </>
                    )}
                  </div>
                  <div
                    className={cn(
                      "p-4 text-sm leading-relaxed border",
                      message.role === "user"
                        ? "bg-primary/5 border-primary/20 text-foreground"
                        : "bg-card border-border text-muted-foreground"
                    )}
                  >
                    {message.text}
                  </div>
                  <span className="text-[10px] text-muted-foreground/50 mt-1 font-mono">
                    {message.timestamp.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Sidebar / Controls */}
        <div className="space-y-6">
          {/* Controls Card */}
          <div className="border border-border rounded-xl p-6 space-y-6 bg-card">
            <div className="space-y-2">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Contrôles
              </h3>
              <div className="h-px bg-border w-10" />
            </div>

            <div className="space-y-4">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={
                  !sessionId ||
                  isProcessing ||
                  !interviewStarted ||
                  isPlayingAudio
                }
                variant={isRecording ? "destructive" : "default"}
                className={cn(
                  "w-full h-14 text-sm uppercase tracking-wide transition-all",
                  isRecording && "animate-pulse"
                )}
              >
                {isRecording ? (
                  <>
                    <StopCircle className="w-4 h-4 mr-2" />
                    Arrêter
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Répondre
                  </>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleEndInterview}
                  disabled={
                    !sessionId ||
                    !interviewStarted ||
                    messages.length < 2 ||
                    isProcessing
                  }
                  variant="outline"
                  className="h-12 border-input hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Terminer
                </Button>

                {!interviewStarted && messages.length > 0 && (
                  <Button
                    onClick={restartInterview}
                    variant="ghost"
                    className="h-12"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="border border-border rounded-xl p-6 space-y-4 bg-muted/5">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4" />
              Guide
            </h3>
            <ul className="text-sm text-muted-foreground space-y-3 font-light">
              <li className="flex gap-3">
                <span className="text-primary font-mono">01</span>
                <span>Écoutez la question du recruteur.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-mono">02</span>
                <span>Cliquez sur "Répondre" pour parler.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-mono">03</span>
                <span>Arrêtez l'enregistrement pour envoyer.</span>
              </li>
            </ul>
          </div>

          {/* Progress Bar */}
          {interviewStarted && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs uppercase tracking-wider text-muted-foreground">
                <span>Progression</span>
                <span>{Math.round((questionCount / 5) * 100)}%</span>
              </div>
              <div className="h-1 bg-muted w-full">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${(questionCount / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Error Toast/Banner */}
      {error && (
        <div className="fixed bottom-6 right-6 max-w-md bg-destructive text-destructive-foreground p-4 shadow-lg border border-destructive-foreground/20 flex items-center gap-4 animate-in slide-in-from-bottom-4">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}