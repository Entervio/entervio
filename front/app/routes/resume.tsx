import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/resume";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { useSetupStore } from "~/services/usesetupstore";
import { authApi } from "~/lib/api";
import { Loader2, Upload, CheckCircle, RefreshCw, Sparkles, MessageSquare, Target, ArrowRight, FileText } from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Importer votre CV - Entervio" },
    { name: "description", content: "Téléchargez votre CV pour une expérience personnalisée" },
  ];
}

export default function ResumeUpload() {
  const navigate = useNavigate();
  const {
    isUploading,
    error,
    uploadResume,
  } = useSetupStore();

  const [hasExistingResume, setHasExistingResume] = useState<boolean | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function checkResume() {
      try {
        const user = await authApi.getMe();
        setHasExistingResume(user.has_resume);
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
        setHasExistingResume(false);
      }
    }
    checkResume();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        await uploadResume(file);
        setJustUploaded(true);
        setHasExistingResume(true);
        setCountdown(5);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      await uploadResume(file);
      setJustUploaded(true);
      setHasExistingResume(true);
      setCountdown(5);
    }
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      navigate("/", { replace: true });
      return;
    }
    const id = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown, navigate]);

  if (hasExistingResume === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24 space-y-12">

        {/* Header */}
        <div className="text-center space-y-4">
          <Badge variant="secondary" className="px-4 py-1.5 text-xs font-medium">
            <Sparkles className="w-3 h-3 mr-1.5" />
            {hasExistingResume ? "Mise à jour" : "Étape 1/2"}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
            {hasExistingResume ? "Mettre à jour votre CV" : "Importez votre CV"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            {hasExistingResume
              ? "Remplacez votre CV actuel par une version plus récente."
              : "Débloquez une expérience 100% personnalisée en quelques secondes."
            }
          </p>
        </div>

        {/* Benefits Grid (only for new users) */}
        {!hasExistingResume && !justUploaded && (
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: <MessageSquare className="w-5 h-5" />,
                title: "Questions sur-mesure",
                description: "L'IA adapte chaque question à votre parcours",
                color: "text-blue-500 bg-blue-500/10"
              },
              {
                icon: <Target className="w-5 h-5" />,
                title: "Offres ciblées",
                description: "Recommandations d'emploi pertinentes",
                color: "text-emerald-500 bg-emerald-500/10"
              },
              {
                icon: <Sparkles className="w-5 h-5" />,
                title: "Feedback précis",
                description: "Analyse basée sur vos compétences",
                color: "text-amber-500 bg-amber-500/10"
              },
            ].map((benefit, index) => (
              <Card key={index} className="border bg-card">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg ${benefit.color}`}>
                    {benefit.icon}
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{benefit.title}</p>
                    <p className="text-xs text-muted-foreground">{benefit.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upload Zone */}
        <div>
          {justUploaded ? (
            <div className="p-10 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-emerald-600">
                  CV analysé avec succès !
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Votre profil est maintenant personnalisé.
                </p>
                {countdown !== null && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Redirection dans {countdown}s...
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <Input
                id="resume-upload-button"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />

              <label
                htmlFor="resume-upload-button"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                  flex flex-col items-center justify-center gap-5 p-12 rounded-2xl 
                  border-2 border-dashed cursor-pointer transition-all duration-200 group
                  ${isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }
                  ${isUploading ? "opacity-60 cursor-not-allowed" : ""}
                `}
              >
                <div className={`
                  w-20 h-20 rounded-2xl flex items-center justify-center transition-colors
                  ${isDragging ? "bg-primary/10" : "bg-muted group-hover:bg-muted/80"}
                `}>
                  {isUploading ? (
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  ) : hasExistingResume ? (
                    <RefreshCw className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                  ) : (
                    <FileText className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>

                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">
                    {isUploading
                      ? "Analyse en cours..."
                      : isDragging
                        ? "Déposez votre fichier ici"
                        : hasExistingResume
                          ? "Remplacer mon CV"
                          : "Glissez votre CV ici"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isUploading
                      ? "Extraction des compétences et expériences..."
                      : "ou cliquez pour parcourir • PDF uniquement"
                    }
                  </p>
                </div>

                {!isUploading && (
                  <Button variant="secondary" size="sm" className="pointer-events-none">
                    <Upload className="w-4 h-4 mr-2" />
                    Sélectionner un fichier
                  </Button>
                )}
              </label>
            </>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center mt-4" aria-live="polite">
              {error}
            </p>
          )}
        </div>

        {/* Skip Option */}
        {!justUploaded && (
          <div className="flex flex-col items-center gap-3 pt-6">
            <Button
              variant="default"
              size="lg"
              onClick={() => navigate("/")}
              className="group"
            >
              Continuer sans CV
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Vous pourrez importer votre CV plus tard depuis votre compte.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
