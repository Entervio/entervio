import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import type { Route } from "./+types/interview";
import { Layout } from "~/components/layout/Layout";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { INTERVIEWER_LABELS } from "~/types/interview";
import { cn } from "~/lib/utils";
import { useInterviewStore } from "~/services/useinterviewstore";

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

  // Load interview data on mount
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
  };

  const restartInterview = () => {
    reset();
    navigate("/setup");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
          <Card className="border-2">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="animate-spin w-8 h-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
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
      </Layout>
    );
  }

  if (!interviewId || !sessionId || !candidateName) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
          <Card className="max-w-md border-2">
            <CardContent className="text-center pt-12 pb-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
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
      </Layout>
    );
  }

  const interviewerInfo =
    INTERVIEWER_LABELS[interviewerType] || INTERVIEWER_LABELS.neutral;

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Header Card */}
        <Card className="mb-6 border-2 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
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
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
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
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                        clipRule="evenodd"
                      />
                    </svg>
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
                      <svg
                        className="w-3 h-3 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Question {questionCount}/5
                    </Badge>

                    {isPlayingAudio && (
                      <Badge variant="secondary" className="animate-pulse">
                        <svg
                          className="w-3 h-3 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
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
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="h-auto p-1 hover:bg-transparent"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Messages Container */}
          <div className="lg:col-span-2">
            <Card className="border-2 shadow-lg">
              <CardContent className="p-0">
                <div className="h-[600px] overflow-y-auto p-6 bg-gradient-to-b from-muted/5 to-transparent">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <svg
                          className="w-10 h-10 text-primary animate-pulse"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
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
                                ? "bg-gradient-to-br from-primary to-accent text-white"
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
                                    ? "bg-white/20 text-white"
                                    : cn(interviewerInfo.bg, interviewerInfo.color)
                                )}
                              >
                                {message.role === "user" ? (
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                ) : (
                                  <span>{interviewerInfo.icon}</span>
                                )}
                              </div>
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  message.role === "user"
                                    ? "text-white/90"
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
                                    ? "text-white/70"
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
                                  ? "text-white"
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

          {/* Controls Sidebar */}
          <div className="space-y-6">
            {/* Recording Controls */}
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
                  variant={isRecording ? "destructive" : "default"}
                  className={cn(
                    "w-full h-16 text-base font-semibold shadow-md",
                    isRecording && "animate-pulse"
                  )}
                >
                  {isRecording ? (
                    <>
                      <div className="w-5 h-5 bg-white rounded mr-3" />
                      Arrêter l'enregistrement
                    </>
                  ) : isProcessing ? (
                    <>
                      <svg
                        className="animate-spin w-5 h-5 mr-3"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
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
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Terminer
                  </Button>

                  {!interviewStarted && messages.length > 0 && (
                    <Button
                      onClick={restartInterview}
                      variant="outline"
                      className="flex-1 h-12"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Nouveau
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="border-2 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
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
                        className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
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
    </Layout>
  );
}