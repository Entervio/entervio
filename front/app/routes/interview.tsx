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
} from "lucide-react";

export function meta({}: Route.MetaArgs) {
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
        <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
          <Card className="border-2">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <p className="text-lg font-semibold text-secondary">
                Chargement de votre entretien...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Préparation de l'environnement
              </p>
            </CardContent>
          </Card>
        </div>
    );
  }

  if (!interviewId || !sessionId || !candidateName) {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
          <Card className="max-w-md border-2">
            <CardContent className="text-center pt-12 pb-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-secondary mb-2">
                Session introuvable
              </h2>
              <p className="text-muted-foreground mb-6">
                Cette session d'entretien n'existe pas ou a expiré.
              </p>
              <Button onClick={() => navigate("/")} size="lg">
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
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header Card */}
        <Card className="mb-6 border-2 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-linear-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-secondary">
                      Entretien en cours
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Session active
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center gap-2 bg-muted/20 px-3 py-1.5 rounded-lg">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-medium text-secondary">
                      {candidateName}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                      interviewerInfo.bg
                    )}
                  >
                    <span className="text-lg">{interviewerInfo.icon}</span>
                    <span className={cn("font-medium", interviewerInfo.color)}>
                      {interviewerInfo.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/10 px-3 py-1.5 rounded-lg font-mono">
                    <Building2 className="w-3 h-3" />
                    ID: {interviewId?.slice(0, 8)}...
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start lg:items-end gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full animate-pulse",
                      sessionId ? "bg-emerald-500" : "bg-gray-400"
                    )}
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    {sessionId ? "En ligne" : "Hors ligne"}
                  </span>
                </div>

                {interviewStarted && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="default"
                      className="bg-primary hover:bg-primary-600"
                    >
                      <Info className="w-3 h-3 mr-1" />
                      Question {questionCount}/5
                    </Badge>

                    {isPlayingAudio && (
                      <Badge variant="secondary" className="animate-pulse">
                        <Volume2 className="w-3 h-3 mr-1" />
                        Audio en cours
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Banner */}
        {error && (
          <Alert variant="destructive" className="mb-6 border-2">
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <X className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="h-auto p-1 hover:bg-transparent"
              >
                <X className="w-4 h-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Messages Container */}
          <div className="lg:col-span-2">
            <Card className="border-2 shadow-lg">
              <CardContent className="p-0">
                <div className="h-[600px] overflow-y-auto p-6 bg-linear-to-b from-muted/5 to-transparent">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare className="w-10 h-10 text-primary animate-pulse" />
                      </div>
                      <p className="text-lg font-semibold text-secondary mb-2">
                        Préparation de l'entretien
                      </p>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Le recruteur {interviewerInfo.name.toLowerCase()} va vous
                        poser sa première question
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex animate-in fade-in slide-in-from-bottom-4 duration-300",
                            message.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-5 py-3 shadow-md",
                              message.role === "user"
                                ? "bg-linear-to-br from-primary to-accent"
                                : cn(
                                    "bg-white border-2",
                                    interviewerInfo.border
                                  )
                            )}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                                  message.role === "user"
                                    ? "bg-black/10 text-black"
                                    : cn(interviewerInfo.bg, interviewerInfo.color)
                                )}
                              >
                                {message.role === "user" ? (
                                  <User className="w-3.5 h-3.5" />
                                ) : (
                                  <span>{interviewerInfo.icon}</span>
                                )}
                              </div>
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  message.role === "user"
                                    ? "text-black"
                                    : "text-muted-foreground"
                                )}
                              >
                                {message.role === "user"
                                  ? candidateName
                                  : "Recruteur"}
                              </span>
                              <span
                                className={cn(
                                  "text-xs",
                                  message.role === "user"
                                    ? "text-black/70"
                                    : "text-muted-foreground/70"
                                )}
                              >
                                {message.timestamp.toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p
                              className={cn(
                                "text-sm leading-relaxed whitespace-pre-wrap",
                                message.role === "user"
                                  ? "text-black"
                                  : "text-secondary"
                              )}
                            >
                              {message.text}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-2 shadow-lg">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-secondary mb-4">Contrôles</h3>

                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={
                    !sessionId ||
                    isProcessing ||
                    !interviewStarted ||
                    isPlayingAudio
                  }
                  className={cn(
                    "w-full h-16 text-base font-semibold shadow-md",
                    isRecording && "animate-pulse"
                  )}
                >
                  {isRecording ? (
                    <>
                      <CircleDot className="w-5 h-5 mr-3" />
                      Arrêter l'enregistrement
                    </>
                  ) : isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-3" />
                      Répondre vocalement
                    </>
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button
                    onClick={handleEndInterview}
                    disabled={
                      !sessionId ||
                      !interviewStarted ||
                      messages.length < 2 ||
                      isProcessing
                    }
                    variant="secondary"
                    className="flex-1 h-12"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Terminer
                  </Button>

                  {!interviewStarted && messages.length > 0 && (
                    <Button
                      onClick={restartInterview}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Nouveau
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="border-2 bg-linear-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Info className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary mb-2">
                      Instructions
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>
                          Attendez la fin de l'audio du recruteur avant de répondre
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>
                          Cliquez sur "Répondre" et parlez clairement
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>
                          Cliquez sur "Arrêter" quand vous avez terminé
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress */}
            {interviewStarted && (
              <Card className="border-2">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-secondary mb-4">
                    Progression
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Questions</span>
                      <span className="font-semibold text-secondary">
                        {questionCount}/5
                      </span>
                    </div>
                    <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-primary to-accent transition-all duration-500"
                        style={{ width: `${(questionCount / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
  );
}