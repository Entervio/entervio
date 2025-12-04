import { useNavigate } from "react-router";
import { useEffect } from "react";
import type { Route } from "./+types/setup";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import type { InterviewerType } from "~/types/interview";
import { cn } from "~/lib/utils";
import { useSetupStore } from "~/services/usesetupstore";
import { Loader2, ArrowRight, X, Upload, FileText, CheckCircle, Smile, Meh, Frown, Clock, Mic, Save, BarChart3 } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Configuration - Entervio" },
    {
      name: "description",
      content: "Configurez votre entretien avec un recruteur IA",
    },
  ];
}

const INTERVIEWER_CONFIGS = [
  {
    type: "nice" as InterviewerType,
    label: "Le Mentor",
    icon: <Smile className="w-8 h-8 text-emerald-600" />,
    description: "Idéal pour débuter. Un échange constructif axé sur vos points forts et votre potentiel.",
    color: "emerald",
  },
  {
    type: "neutral" as InterviewerType,
    label: "Le Professionnel",
    icon: <Meh className="w-8 h-8 text-blue-600" />,
    description: "Standard du marché. Une évaluation objective et factuelle de vos compétences.",
    color: "blue",
  },
  {
    type: "mean" as InterviewerType,
    label: "L'Exigeant",
    icon: <Frown className="w-8 h-8 text-red-600" />,
    description: "Haute pression. Teste votre résistance au stress et votre capacité à gérer la contradiction.",
    color: "red",
  },
];

export default function Setup() {
  const navigate = useNavigate();

  const {
    selectedInterviewer,
    candidateId,
    error,
    isStarting,
    isUploading,
    setSelectedInterviewer,
    uploadResume,
    startInterview,
    fetchUserProfile,
  } = useSetupStore();

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        await uploadResume(file);
      }
    }
  };

  const handleStart = async () => {
    const sessionId = await startInterview();
    if (sessionId) {
      navigate(`/interview/${sessionId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center p-6 md:p-12 font-sans">
      <div className="w-full max-w-6xl grid lg:grid-cols-[1fr_320px] gap-12 items-start">

        {/* Main Configuration Area */}
        <div className="space-y-12">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-primary">
              Configuration de la session
            </h1>
            <p className="text-xl text-muted-foreground font-light max-w-2xl">
              Personnalisez votre expérience pour simuler les conditions réelles de votre prochain entretien.
            </p>
          </div>

          {/* Recruiter Selection */}
          <div className="space-y-6">
            <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              01. Choisissez votre interlocuteur
            </Label>
            <div className="grid gap-6 md:grid-cols-3">
              {INTERVIEWER_CONFIGS.map((config) => (
                <div
                  key={config.type}
                  onClick={() => setSelectedInterviewer(config.type)}
                  className={cn(
                    "group relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-md",
                    selectedInterviewer === config.type
                      ? "border-primary bg-secondary/10 shadow-[var(--shadow-diffuse)]"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  {/* Selection Indicator */}
                  <div className={cn(
                    "absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                    selectedInterviewer === config.type
                      ? "border-primary bg-primary text-white"
                      : "border-muted-foreground/30"
                  )}>
                    {selectedInterviewer === config.type && <CheckCircle2 className="w-4 h-4" />}
                  </div>

                  <div className="mb-6 p-3 w-fit rounded-xl bg-white shadow-sm border border-border">
                    {config.icon}
                  </div>

                  <h3 className="font-serif text-xl font-medium mb-2 text-foreground">
                    {config.label}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {config.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Context Inputs */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                02. Contexte du poste
              </Label>
              <div className="relative group">
                <div className="absolute left-4 top-4 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <textarea
                  value={useSetupStore((state) => state.jobDescription)}
                  onChange={(e) => useSetupStore.getState().setJobDescription(e.target.value)}
                  placeholder="Collez la description du poste ici..."
                  className="w-full min-h-[160px] rounded-xl border border-border bg-card p-4 pl-12 text-base shadow-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary resize-none transition-all"
                  disabled={isStarting}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                03. Votre Profil
              </Label>

              {candidateId ? (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 text-emerald-900">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium">CV Analysé avec succès</p>
                    <p className="text-sm text-emerald-700/80">Votre profil sera utilisé pour personnaliser les questions.</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    id="resume"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isUploading || isStarting}
                  />
                  <label
                    htmlFor="resume"
                    className={cn(
                      "flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-border bg-card hover:bg-muted/30 hover:border-primary/50 cursor-pointer transition-all group",
                      (isUploading || isStarting) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-muted group-hover:bg-white flex items-center justify-center transition-colors shadow-sm">
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      ) : (
                        <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">Télécharger votre CV (PDF)</p>
                      <p className="text-sm text-muted-foreground">Pour une expérience sur-mesure</p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-8 border-t border-border">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-900 rounded-lg border border-red-100 flex items-center gap-3">
                <X className="w-5 h-5" />
                <p>{error}</p>
              </div>
            )}

            <Button
              onClick={handleStart}
              disabled={!selectedInterviewer || isStarting}
              size="lg"
              className="w-full md:w-auto h-14 px-8 text-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl transition-all hover:-translate-y-0.5"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Préparation de la salle...
                </>
              ) : (
                <>
                  Entrer dans la salle
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sticky Sidebar */}
        <div className="hidden lg:block sticky top-8 space-y-6">
          <Card className="border-border shadow-sm bg-card">
            <CardContent className="p-6 space-y-6">
              <h3 className="font-serif text-xl font-medium text-foreground">Paramètres de la session</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Durée estimée</p>
                    <p className="text-sm text-muted-foreground">15 minutes environ</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mic className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Mode vocal</p>
                    <p className="text-sm text-muted-foreground">Microphone requis pour les réponses</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Save className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Enregistrement</p>
                    <p className="text-sm text-muted-foreground">Sauvegarde automatique de la session</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Rapport détaillé</p>
                    <p className="text-sm text-muted-foreground">Analyse IA post-entretien</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Vos données sont chiffrées et privées.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}