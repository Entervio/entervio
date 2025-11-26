import { useNavigate } from "react-router";
import type { Route } from "./+types/setup";
import { Layout } from "~/components/layout/Layout";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import type { InterviewerType } from "~/types/interview";
import { cn } from "~/lib/utils";
import { useSetupStore } from "~/services/usesetupstore";
import { Loader2, ArrowRight, X, Upload, FileText, CheckCircle } from "lucide-react";

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
    label: "Bienveillant",
    icon: "😊",
    description: "Un recruteur encourageant qui vous met en confiance",
    borderColor: "border-emerald-500/30",
    hoverBorder: "hover:border-emerald-500",
    activeBorder: "border-emerald-500",
    bgHover: "hover:bg-emerald-500/10",
    bgActive: "bg-emerald-500/10",
  },
  {
    type: "neutral" as InterviewerType,
    label: "Professionnel",
    icon: "😐",
    description: "Un recruteur objectif et factuel dans ses évaluations",
    borderColor: "border-primary/30",
    hoverBorder: "hover:border-primary",
    activeBorder: "border-primary",
    bgHover: "hover:bg-primary/10",
    bgActive: "bg-primary/10",
  },
  {
    type: "mean" as InterviewerType,
    label: "Exigeant",
    icon: "😤",
    description: "Un recruteur direct qui teste votre gestion du stress",
    borderColor: "border-red-500/30",
    hoverBorder: "hover:border-red-500",
    activeBorder: "border-red-500",
    bgHover: "hover:bg-red-500/10",
    bgActive: "bg-red-500/10",
  },
];

export default function Setup() {
  const navigate = useNavigate();

  // Get state and actions from store
  const {
    candidateName,
    selectedInterviewer,
    candidateId,
    error,
    isStarting,
    isUploading,
    setCandidateName,
    setSelectedInterviewer,
    uploadResume,
    startInterview,
  } = useSetupStore();

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
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            Configuration de l'entretien
          </h1>
          <p className="text-muted-foreground text-lg font-light">
            Personnalisez votre expérience.
          </p>
        </div>

        {/* Main Setup Section */}
        <div className="grid gap-12 md:grid-cols-[1fr_300px]">
          <div className="space-y-10">
            {/* Name Input */}
            <div className="space-y-4">
              <Label
                htmlFor="name"
                className="text-base font-medium uppercase tracking-wider text-muted-foreground"
              >
                01. Identité
              </Label>
              <Input
                id="name"
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Votre nom complet"
                className="h-12 text-lg border-x-0 border-t-0 border-b border-input bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary text-foreground placeholder:text-muted-foreground/50"
                autoFocus
                disabled={isStarting}
              />
            </div>

            {/* Job Description */}
            <div className="space-y-4">
              <Label
                htmlFor="jobDescription"
                className="text-base font-medium uppercase tracking-wider text-muted-foreground"
              >
                02. Description du poste (Optionnel)
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <textarea
                  id="jobDescription"
                  value={useSetupStore((state) => state.jobDescription)}
                  onChange={(e) => useSetupStore.getState().setJobDescription(e.target.value)}
                  placeholder="Collez ici la description du poste pour un entretien personnalisé..."
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-10 resize-none"
                  disabled={isStarting}
                />
              </div>
            </div>

            {/* Resume Upload */}
            <div className="space-y-4">
              <Label className="text-base font-medium uppercase tracking-wider text-muted-foreground">
                03. CV (Optionnel)
              </Label>
              <div className="group relative">
                {candidateId ? (
                  <div className="flex items-center gap-3 py-4 text-emerald-500 border-b border-emerald-500/20">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">CV analysé</span>
                  </div>
                ) : (
                  <>
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
                        "flex items-center gap-3 py-4 cursor-pointer border-b border-input transition-colors hover:border-primary hover:text-primary text-muted-foreground",
                        (isUploading || isStarting) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                      <span className="font-medium">
                        {isUploading ? "Analyse..." : "Télécharger CV (PDF)"}
                      </span>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Interviewer Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium uppercase tracking-wider text-muted-foreground">
                04. Recruteur
              </Label>
              <div className="grid gap-4 sm:grid-cols-3">
                {INTERVIEWER_CONFIGS.map((config) => (
                  <button
                    key={config.type}
                    onClick={() => setSelectedInterviewer(config.type)}
                    disabled={isStarting}
                    className={cn(
                      "group relative p-4 text-left border rounded-xl transition-all duration-200",
                      selectedInterviewer === config.type
                        ? `${config.activeBorder} ${config.bgActive} text-foreground shadow-sm`
                        : `border-muted hover:border-primary/30 hover:bg-muted/30 text-muted-foreground hover:text-foreground`,
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <div className="text-2xl mb-3">{config.icon}</div>
                    <h3 className="font-medium mb-1">
                      {config.label}
                    </h3>
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                      {config.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg flex items-center gap-2">
                <X className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Start Button */}
            <div className="pt-4">
              <Button
                onClick={handleStart}
                disabled={!candidateName.trim() || !selectedInterviewer || isStarting}
                className="w-full md:w-auto text-base h-12 px-8"
                size="lg"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Initialisation...
                  </>
                ) : (
                  <>
                    Commencer l'entretien
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="hidden md:block border-l border-border pl-8 space-y-8">
            {[
              {
                title: "Durée",
                desc: "10-15 min",
              },
              {
                title: "Audio",
                desc: "Micro requis",
              },
              {
                title: "Sauvegarde",
                desc: "Automatique",
              },
              {
                title: "Feedback",
                desc: "Détaillé",
              },
            ].map((item, index) => (
              <div key={index} className="space-y-1">
                <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">
                  {item.title}
                </h4>
                <p className="text-lg font-light text-foreground">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}