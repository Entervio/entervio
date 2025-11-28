import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import type { Route } from "./+types/resume";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useSetupStore } from "~/services/usesetupstore";
import { Loader2, Upload, CheckCircle } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Importer votre CV - Entervio" },
    { name: "description", content: "Téléchargez votre CV pour une analyse personnalisée" },
  ];
}

export default function ResumeUpload() {
  const navigate = useNavigate();
  const {
    candidateId,
    isUploading,
    error,
    uploadResume,
  } = useSetupStore();

  const [countdown, setCountdown] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        await uploadResume(file);
      }
    }
  };

  useEffect(() => {
    if (candidateId && countdown === null) {
      setCountdown(5);
    }
  }, [candidateId, countdown]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      navigate("/", { replace: true });
      return;
    }
    const id = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown, navigate]);

  return (
    <div className="container mx-auto px-6 py-16 max-w-xl">
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Importer votre CV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground text-center">
            Téléchargez votre CV au format PDF pour que nous puissions analyser vos
            compétences et votre expérience.
          </p>

          <div className="space-y-4">
            {candidateId ? (
              <div className="flex flex-col items-center gap-2 py-4 border rounded-md border-emerald-500/40 bg-emerald-500/5">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-600">
                  CV analysé avec succès.
                </p>
                {countdown !== null && (
                  <p className="text-xs text-muted-foreground">
                    Redirection vers l'accueil dans {countdown}s...
                  </p>
                )}
              </div>
            ) : (
              <>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  asChild
                  disabled={isUploading}
                >
                  <label htmlFor="resume-upload-button" className="cursor-pointer w-full flex items-center justify-center gap-2">
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyse du CV...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Sélectionner un CV (PDF)</span>
                      </>
                    )}
                  </label>
                </Button>
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500" aria-live="polite">
              {error}
            </p>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Vous pourrez ensuite configurer un entretien personnalisé depuis la page
            d'accueil.
          </p>

          <p className="text-xs text-muted-foreground text-center mt-2">
            <Link to="/" className="underline">
              Passer cette étape pour le moment
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
