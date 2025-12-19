import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import type { Route } from "./+types/interview";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { INTERVIEWER_LABELS } from "~/types/interview";
import { cn } from "~/lib/utils";
import { useInterviewStore } from "~/services/useinterviewstore";
import {
  Loader2,
  AlertTriangle,
  Mic,
  X,
  StopCircle,
  PhoneOff,
  Volume2,
  MoreVertical,
  SkipForward,
  RotateCcw,
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
  const [showTranscript, setShowTranscript] = useState(false);

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
    skipAudio,
    replayLastAudio,
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

    return () => {
      cleanup();
    };
  }, [interviewId, navigate, loadInterviewData, cleanup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleEndInterview = async () => {
    await endInterview();
    navigate(`/interview/${sessionId}/feedback`);
  };

  const handleAudioControl = () => {
    if (isPlayingAudio) {
      skipAudio();
    } else {
      replayLastAudio();
    }
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
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="mt-6 rounded-full px-8"
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
  const lastMessage =
    messages.length > 0 ? messages[messages.length - 1] : null;
  const lastInterviewerMessage = messages
    .slice()
    .reverse()
    .find((m) => m.role === "assistant");

  return (
    <div className="min-h-screen w-full bg-background flex flex-col font-sans text-foreground relative">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-secondary/20 via-background to-background pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 left-0 right-0 z-50 p-6 flex justify-between items-center border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 bg-background/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/50 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">
            {questionCount}{" "}
            {questionCount > 1 ? "questions posées" : "question posée"}
          </span>
        </div>

        <Button
          size="lg"
          className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg h-12 px-6 gap-2"
          onClick={handleEndInterview}
        >
          <PhoneOff className="w-5 h-5" />
          <span className="font-medium">Raccrocher</span>
        </Button>
      </header>

      {/* Main Focus Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 max-w-4xl mx-auto w-full overflow-y-auto py-24">
        {/* Avatar / Visualizer */}
        <div className="mb-12 relative">
          <div
            className={cn(
              "w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center text-4xl shadow-2xl transition-all duration-500",
              isPlayingAudio
                ? "bg-primary text-primary-foreground scale-110 shadow-primary/30 ring-4 ring-primary/20"
                : "bg-white text-foreground border border-border shadow-lg",
            )}
          >
            {isPlayingAudio ? (
              <Volume2 className="w-12 h-12 animate-pulse" />
            ) : (
              <span className="text-5xl">{interviewerInfo.icon}</span>
            )}
          </div>

          {/* Ripple Effect when talking */}
          {isPlayingAudio && (
            <>
              <div className="absolute inset-0 rounded-full border border-primary/30 animate-[ping_2s_ease-in-out_infinite]" />
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-[ping_2s_ease-in-out_infinite_0.5s]" />
            </>
          )}
        </div>

        {/* Current Question / Context */}
        <div className="text-center space-y-6 max-w-2xl">
          {lastInterviewerMessage ? (
            <h2 className="text-xl md:text-2xl lg:text-3xl font-serif font-medium leading-tight text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">
              {lastInterviewerMessage.text}
            </h2>
          ) : (
            <h2 className="text-2xl md:text-3xl font-serif font-medium text-muted-foreground animate-pulse">
              Le recruteur prépare sa question...
            </h2>
          )}

          {/* Live Transcript / User Feedback */}
          {isRecording && (
            <div className="mt-8 p-4 rounded-2xl bg-secondary/10 border border-secondary/20 text-secondary-foreground animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Mic className="w-4 h-4 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Écoute en cours
                </span>
              </div>
              <p className="text-lg font-light italic opacity-80">"..."</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Control Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6">
        <div className="bg-white/90 backdrop-blur-xl border border-border/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-2xl p-2 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => setShowTranscript(!showTranscript)}
          >
            <MoreVertical className="w-5 h-5" />
          </Button>

          <Button
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={
              !sessionId || isProcessing || !interviewStarted || isPlayingAudio
            }
            className={cn(
              "flex-1 h-14 rounded-xl text-lg font-medium shadow-lg transition-all duration-300",
              isRecording
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                : "bg-primary hover:bg-primary/90 text-primary-foreground",
            )}
          >
            {isRecording ? (
              <div className="flex items-center gap-2">
                <StopCircle className="w-5 h-5 fill-current animate-pulse" />
                <span>Terminer la réponse</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                <span>{isProcessing ? "Analyse..." : "Répondre"}</span>
              </div>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-50"
            onClick={handleAudioControl}
            disabled={!lastInterviewerMessage}
            title={isPlayingAudio ? "Passer l'audio" : "Rejouer l'audio"}
          >
            {isPlayingAudio ? (
              <SkipForward className="w-5 h-5" />
            ) : (
              <RotateCcw className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Transcript Drawer / Overlay (Optional) */}
      {showTranscript && (
        <div className="absolute inset-x-0 bottom-0 top-24 bg-background/95 backdrop-blur-sm z-40 border-t border-border rounded-t-3xl shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-bottom-full duration-500">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-xl">Transcription</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTranscript(false)}
              >
                Fermer
              </Button>
            </div>
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col gap-1",
                  m.role === "user" ? "items-end" : "items-start",
                )}
              >
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {m.role === "user" ? "Vous" : interviewerInfo.name}
                </span>
                <div
                  className={cn(
                    "p-4 rounded-2xl max-w-[85%]",
                    m.role === "user"
                      ? "bg-secondary/20 text-secondary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <Alert
            variant="destructive"
            className="shadow-xl max-w-md bg-destructive text-destructive-foreground border-none rounded-xl"
          >
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
