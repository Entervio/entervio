import { useState } from "react";
import { useJobsStore } from "~/services/jobs-store";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { FileText, Wand2, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { Label } from "~/components/ui/label";

export default function ManualJobPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [isTailoring, setIsTailoring] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const { tailorResume, generateCoverLetter } = useJobsStore();

  const handleTailorResume = async () => {
    if (!jobDescription.trim()) {
      toast.error("Veuillez coller une description de poste.");
      return;
    }

    setIsTailoring(true);
    try {
      const blob = await tailorResume(jobDescription);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cv_adapte.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("CV adapté généré avec succès !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération du CV adapté.");
    } finally {
      setIsTailoring(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!jobDescription.trim()) {
      toast.error("Veuillez coller une description de poste.");
      return;
    }

    setIsGeneratingCoverLetter(true);
    try {
      const blob = await generateCoverLetter(jobDescription);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lettre_motivation.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Lettre de motivation générée avec succès !");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération de la lettre de motivation.");
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">L'Atelier</h1>
        <p className="text-muted-foreground">
          Collez une description de poste pour générer des documents sur mesure.
        </p>
      </div>
      <div className="grid gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Description du Poste</CardTitle>
            <CardDescription>
              Copiez-collez ici l'intégralité de l'offre d'emploi pour permettre
              à l'IA d'analyser le contexte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="job-description" className="sr-only">
                  Description
                </Label>
                <Textarea
                  id="job-description"
                  placeholder="Ex: Nous recherchons un développeur Fullstack..."
                  className="min-h-[300px] font-mono text-sm p-4 bg-muted/10 border-border/50 rounded-xl focus:bg-background transition-colors resize-y"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleTailorResume}
                  disabled={isTailoring || !jobDescription.trim()}
                  className="flex-1 h-11"
                  size="lg"
                >
                  {isTailoring ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adaptation en cours...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Adapter mon CV
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleGenerateCoverLetter}
                  disabled={isGeneratingCoverLetter || !jobDescription.trim()}
                  variant="outline"
                  className="flex-1 h-11"
                  size="lg"
                >
                  {isGeneratingCoverLetter ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rédaction en cours...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Générer une Lettre de Motivation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                Pourquoi adapter son CV ?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              L'IA analyse les mots-clés de l'offre et reformule vos expériences
              pour maximiser votre score de pertinence (ATS) tout en restant
              fidèle à votre parcours.
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Wand2 className="h-4 w-4" />
                </div>
                Lettre de motivation intelligente
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              Générez une lettre unique qui fait le lien entre vos compétences
              et les besoins spécifiques de l'entreprise, avec un ton
              professionnel et engageant.
            </CardContent>
          </Card>
        </div>
      </div>{" "}
    </div>
  );
}
