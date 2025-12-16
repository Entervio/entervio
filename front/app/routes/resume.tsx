import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/resume";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-4xl">

        {/* Main Card */}
        <Card className="relative overflow-hidden border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
          {/* Decorative gradient blob */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <CardHeader className="relative z-10 text-center pb-2">
            <Badge variant="secondary" className="w-fit mx-auto mb-4 px-4 py-1.5 text-xs font-medium">
              <Sparkles className="w-3 h-3 mr-1.5" />
              {hasExistingResume ? "Mise à jour" : "Étape 1/2"}
            </Badge>
            <CardTitle className="text-3xl md:text-4xl font-serif tracking-tight">
              {hasExistingResume ? "Mettre à jour votre CV" : "Importez votre CV"}
            </CardTitle>
            <CardDescription className="text-base md:text-lg max-w-md mx-auto mt-2">
              {hasExistingResume
                ? "Remplacez votre CV actuel par une version plus récente."
                : "Débloquez une expérience 100% personnalisée en quelques secondes."
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="relative z-10 space-y-8 pt-4">

            {/* Benefits Grid (only for new users) */}
            {!hasExistingResume && !justUploaded && (
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    icon: <MessageSquare className="w-5 h-5" />,
                    title: "Questions sur-mesure",
                    description: "L'IA adapte chaque question à votre parcours unique",
                    color: "text-blue-500 bg-blue-500/10"
                  },
                  {
                    icon: <Target className="w-5 h-5" />,
                    title: "Offres ciblées",
                    description: "Recevez des recommandations d'emploi pertinentes",
                    color: "text-emerald-500 bg-emerald-500/10"
                  },
                  {
                    icon: <Sparkles className="w-5 h-5" />,
                    title: "Feedback précis",
                    description: "Analyse détaillée basée sur vos compétences réelles",
                    color: "text-amber-500 bg-amber-500/10"
                  },
                ].map((benefit, index) => (
                  <Card key={index} className="border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg ${benefit.color}`}>
                        {benefit.icon}
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{benefit.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{benefit.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Upload Zone */}
            <div className="relative">
              {justUploaded ? (
                <Card className="border-2 border-emerald-500/30 bg-emerald-500/5">
                  <CardContent className="p-8 flex flex-col items-center gap-4">
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
                  </CardContent>
                </Card>
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
                      relative flex flex-col items-center justify-center gap-5 p-12 rounded-2xl 
                      border-2 border-dashed cursor-pointer transition-all duration-300 group
                      ${isDragging
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }
                      ${isUploading ? "opacity-60 cursor-not-allowed" : ""}
                    `}
                  >
                    {/* Animated icon */}
                    <div className={`
                      w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
                      ${isDragging ? "bg-primary/20 scale-110" : "bg-muted group-hover:bg-primary/10"}
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

                    {/* Upload button inside */}
                    {!isUploading && (
                      <Button variant="secondary" size="sm" className="mt-2 pointer-events-none">
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
              <div className="flex flex-col items-center gap-2 pt-4 border-t border-border/50">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/")}
                  className="text-muted-foreground hover:text-foreground group"
                >
                  Passer cette étape
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
                <p className="text-xs text-muted-foreground/70 text-center max-w-sm">
                  Vous pourrez importer votre CV à tout moment depuis les paramètres de votre compte.
                </p>
              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
