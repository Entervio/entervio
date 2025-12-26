import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Building2,
  Briefcase,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Search,
  FileText,
  Download,
  Mail,
  ArrowLeft,
  Mic,
  CheckCircle,
} from "lucide-react";
import { jobsService, type JobOffer } from "~/services/jobs";
import { useSetupStore } from "~/services/usesetupstore";
import { cn } from "~/lib/utils";

function formatSalary(salary: string): string {
  // Example: "Annuel de 35000.0 Euros à 39000.0 Euros sur 12.0 mois"
  // Example: "Mensuel de 32000.0 Euros à 35000.0 Euros sur 12.0 mois"
  try {
    // Extract numbers (handle 35000.0, 35000, 35 000)
    const matches = salary.replace(/\s/g, "").match(/(\d+(?:[\.,]\d+)?)/g);

    if (matches && matches.length >= 1) {
      // Parse numbers (replace comma with dot if needed)
      const nums = matches.map((m) => parseFloat(m.replace(",", ".")));
      const min = nums[0];
      const max = nums.length > 1 ? nums[1] : min;

      const formatNum = (n: number) => {
        if (n >= 1000) return `${Math.round(n / 1000)}k€`;
        return `${n}€`;
      };

      const lowerSalary = salary.toLowerCase();
      let period = "";

      if (lowerSalary.includes("annuel") || lowerSalary.includes("an"))
        period = "/ an";
      else if (lowerSalary.includes("mensuel") || lowerSalary.includes("mois"))
        period = "/ mois";
      else if (lowerSalary.includes("horaire") || lowerSalary.includes("heure"))
        period = "/ h";

      if (min === max) {
        return `${formatNum(min)} ${period}`;
      }
      return `${formatNum(min)} - ${formatNum(max)} ${period}`;
    }
    return salary;
  } catch (e) {
    return salary;
  }
}

// --- Components ---

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";

function TailorResumeDialog({
  jobDescription,
  jobTitle,
}: {
  jobDescription: string;
  jobTitle: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"idle" | "generating" | "preview">("idle");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");

  const messages = [
    "Analyse de l'offre...",
    "Extraction des compétences clés...",
    "Adaptation du profil...",
    "Rédaction des accroches...",
    "Génération du PDF...",
  ];

  // Cleanup blob URL when dialog closes
  useEffect(() => {
    if (!isOpen && pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      setStep("idle");
    }
  }, [isOpen, pdfUrl]);

  const handleGenerate = async () => {
    setStep("generating");
    let msgIndex = 0;
    setLoadingMessage(messages[0]);

    // Cycle through messages while loading
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingMessage(messages[msgIndex]);
    }, 1500);

    try {
      const blob = await jobsService.tailorResume(jobDescription);
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      setStep("preview");
    } catch (error) {
      console.error("Failed to tailor resume:", error);
      alert("Erreur lors de la génération du CV. Veuillez réessayer.");
      setStep("idle");
    } finally {
      clearInterval(interval);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `CV_Tailored_${jobTitle.replace(/[^a-z0-9]/gi, "_").substring(0, 20)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full h-12 px-6 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
        >
          <FileText className="w-4 h-4 mr-2" />
          Adapter mon CV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-white z-10">
          <DialogTitle className="flex items-center gap-2 text-xl font-serif">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            CV Sur-Mesure
          </DialogTitle>
          <DialogDescription>
            Générez une version de votre CV parfaitement alignée avec ce poste.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 bg-gray-50/50 relative overflow-hidden flex flex-col">
          {step === "idle" && (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-gray-500 space-y-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
                <Sparkles className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-lg font-serif text-gray-900">
                  Prêt à impressionner ?
                </h3>
                <p>
                  Notre IA va analyser l'offre <strong>{jobTitle}</strong> et
                  réécrire votre CV pour mettre en avant vos expériences les
                  plus pertinentes.
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                size="lg"
                className="rounded-full px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200/50"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Générer mon CV Spécifique
              </Button>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-8 animate-in fade-in duration-500">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-gray-100 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-emerald-500 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-gray-900">
                  {loadingMessage}
                </h3>
                <p className="text-sm text-gray-500">
                  Cela peut prendre quelques secondes...
                </p>
              </div>
            </div>
          )}

          {step === "preview" && pdfUrl && (
            <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <iframe
                src={pdfUrl}
                className="w-full flex-1 border-0 bg-gray-100"
                title="Resume Preview"
              />
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-white">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          {step === "preview" && (
            <Button
              onClick={handleDownload}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger le PDF
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GenerateCoverLetterDialog({
  jobDescription,
  jobTitle,
}: {
  jobDescription: string;
  jobTitle: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"idle" | "generating" | "preview">("idle");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");

  const messages = [
    "Analyse de l'offre d'emploi...",
    "Identification des points clés...",
    "Extraction des informations de l'entreprise...",
    "Rédaction de la lettre personnalisée...",
    "Mise en forme professionnelle...",
    "Génération du PDF...",
  ];

  // Cleanup blob URL when dialog closes
  useEffect(() => {
    if (!isOpen && pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      setStep("idle");
    }
  }, [isOpen, pdfUrl]);

  const handleGenerate = async () => {
    setStep("generating");
    let msgIndex = 0;
    setLoadingMessage(messages[0]);

    // Cycle through messages while loading
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingMessage(messages[msgIndex]);
    }, 1800);

    try {
      const blob = await jobsService.generateCoverLetter(jobDescription);
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
      setStep("preview");
    } catch (error) {
      console.error("Failed to generate cover letter:", error);
      alert(
        "Erreur lors de la génération de la lettre de motivation. Veuillez réessayer.",
      );
      setStep("idle");
    } finally {
      clearInterval(interval);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `Lettre_Motivation_${jobTitle.replace(/[^a-z0-9]/gi, "_").substring(0, 20)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full h-12 px-6 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
        >
          <Mail className="w-4 h-4 mr-2" />
          Générer Lettre de Motivation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-white z-10">
          <DialogTitle className="flex items-center gap-2 text-xl font-serif">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Lettre de Motivation Personnalisée
          </DialogTitle>
          <DialogDescription>
            Générez une lettre de motivation en français adaptée à ce poste.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 bg-gray-50/50 relative overflow-hidden flex flex-col">
          {step === "idle" && (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-gray-500 space-y-6">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                <Mail className="w-10 h-10 text-blue-500" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-lg font-serif text-gray-900">
                  Lettre professionnelle en un clic
                </h3>
                <p>
                  Notre IA va analyser l'offre <strong>{jobTitle}</strong> et
                  rédiger une lettre de motivation convaincante qui met en
                  valeur votre profil et votre motivation.
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                size="lg"
                className="rounded-full px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Générer ma Lettre
              </Button>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-8 animate-in fade-in duration-500">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-gray-100 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-bold text-gray-900">
                  {loadingMessage}
                </h3>
                <p className="text-sm text-gray-500">
                  Notre IA rédige votre lettre...
                </p>
              </div>
            </div>
          )}

          {step === "preview" && pdfUrl && (
            <div className="w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <iframe
                src={pdfUrl}
                className="w-full flex-1 border-0 bg-gray-100"
                title="Cover Letter Preview"
              />
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 bg-white">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Annuler
          </Button>
          {step === "preview" && (
            <Button
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger le PDF
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JobCard({
  job,
  isSelected,
  onClick,
}: {
  job: JobOffer;
  isSelected: boolean;
  onClick: () => void;
}) {
  const matchTextColor =
    job.relevance_score && job.relevance_score >= 80
      ? "text-emerald-600"
      : "text-yellow-600";

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative p-5 transition-all duration-200 cursor-pointer hover:bg-gray-50",
        isSelected ? "bg-white" : "bg-white",
        "border-b border-gray-100 last:border-0", // Hairline separator
      )}
    >
      {/* Left Edge Indicator */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 transition-colors",
          isSelected ? "bg-primary" : "bg-transparent group-hover:bg-gray-200",
        )}
      />

      <div className="flex justify-between items-start gap-3 mb-1">
        <h3
          className={cn(
            "font-bold text-lg leading-tight transition-colors text-gray-900",
            isSelected && "text-primary",
          )}
        >
          {job.intitule}
        </h3>

        <div className="flex items-center gap-2">
          {/* Applied Badge */}
          {job.is_applied && (
            <span className="shrink-0 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full border border-green-200">
              Déjà postulé
            </span>
          )}

          {/* Match Score: Badge of Honor */}
          {job.relevance_score !== undefined && (
            <div
              className={cn(
                "shrink-0 font-bold text-sm flex items-center gap-1",
                matchTextColor,
              )}
            >
              {job.relevance_score}% Match
            </div>
          )}
        </div>
      </div>

      {/* Naked Data: Company · Location · Salary */}
      <div className="flex flex-wrap items-center gap-x-2 text-sm text-gray-500 font-medium mb-3">
        <span className="uppercase tracking-wide text-xs font-bold text-gray-400">
          {job.entreprise?.nom || "Confidentiel"}
        </span>
        <span className="text-gray-300">·</span>
        <span>{job.lieuTravail.libelle}</span>
        <span className="text-gray-300">·</span>
        <span>{job.typeContrat}</span>
        {job.salaire?.libelle && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-gray-700">
              {formatSalary(job.salaire.libelle)}
            </span>
          </>
        )}
      </div>

      {/* Inline AI Insight */}
      {job.relevance_reasoning && (
        <div className="flex items-start gap-2 text-sm text-gray-600 font-bold leading-relaxed">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p className="line-clamp-2">{job.relevance_reasoning}</p>
        </div>
      )}

      {/* Arrow Action (Hidden by default, visible on hover/select) */}
      <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
}

function JobDetail({
  job,
  onBack,
  onApply,
}: {
  job: JobOffer | null;
  onBack: () => void;
  onApply: (jobId: string) => void;
}) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top when job changes
  useEffect(() => {
    if (job?.id && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [job?.id]);

  if (!job) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-12 text-muted-foreground bg-white rounded-2xl border border-dashed border-gray-200">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Briefcase className="w-8 h-8 text-gray-300" />
        </div>

        <p className="text-lg font-medium text-gray-900">
          Sélectionnez une offre
        </p>

        <p className="text-sm mt-1">
          Cliquez sur une offre à gauche pour voir les détails.
        </p>
      </div>
    );
  }

  const applyUrl =
    job.urlPartner ||
    job.contact?.urlPostulation ||
    job.origineOffre?.urlOrigine;

  const handlePostulerClick = async () => {
    if (!applyUrl) return;

    // 1. Open link immediately (best UX)
    window.open(applyUrl, "_blank", "noopener,noreferrer");

    // 2. Track in backend
    try {
      await jobsService.trackApplication(
        job.id,
        job.intitule,
        job.entreprise?.nom,
      );
      // 3. Update local state
      onApply(job.id);
    } catch (error) {
      console.error("Failed to track application:", error);
    }
  };

  return (
    <div
      ref={scrollRef}
      className={cn(
        "bg-white border-gray-100 shadow-sm",
        // DESKTOP: Fixed height container with internal scroll
        "lg:h-full lg:overflow-y-auto lg:rounded-2xl lg:border",
        // MOBILE: Let it be a normal, fluid element (handled by parent overflow if needed, but usually mobile is stacked)
        "h-full overflow-y-auto w-full relative",
      )}
    >
      {" "}
      <Button
        onClick={onBack}
        variant="ghost"
        className="lg:hidden absolute top-2 left-2 z-10 h-10 w-10 p-0 text-gray-600"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      {/* Header Image/Pattern */}
      <div className="h-32 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-100 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        ></div>
      </div>
      <div className="px-8 pb-12 -mt-12 relative">
        {/* Company Logo (Placeholder) */}
        <div className="w-24 h-24 bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center justify-center mb-6">
          <Building2 className="w-10 h-10 text-gray-800" />
        </div>

        {/* Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            {job.is_applied && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-3">
                <CheckCircle className="w-4 h-4" />
                Vous avez postulé à cette offre
              </div>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-2">
              {job.intitule}
            </h1>
            <div className="flex items-center gap-2 text-lg text-gray-600">
              <span className="font-medium">
                {job.entreprise?.nom || "Entreprise confidentielle"}
              </span>
              <span>•</span>
              <span>{job.lieuTravail.libelle}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TailorResumeDialog
                jobDescription={job.description}
                jobTitle={job.intitule}
              />
              <GenerateCoverLetterDialog
                jobDescription={job.description}
                jobTitle={job.intitule}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full h-12 px-6 border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-800 transition-all md:col-span-2 shadow-sm"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Simuler un entretien
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                  <AlertDialogHeader>
                    <div className="mx-auto bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                      <Mic className="w-6 h-6 text-indigo-600" />
                    </div>
                    <AlertDialogTitle className="text-center font-serif text-2xl">
                      Commencer une simulation ?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-base">
                      Vous allez être redirigé vers l'espace de configuration
                      d'entretien. La description de ce poste sera
                      automatiquement utilisée pour personnaliser la simulation.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="sm:justify-center gap-2 mt-4">
                    <AlertDialogCancel className="rounded-full px-8 h-12 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors mt-0">
                      Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        useSetupStore
                          .getState()
                          .setJobDescription(job.description);
                        navigate("/setup");
                      }}
                      className="rounded-full px-8 h-12 bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
                    >
                      Commencer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {applyUrl && (
              <Button
                onClick={handlePostulerClick}
                size="lg"
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 px-8 h-12 text-base font-medium transition-transform hover:-translate-y-0.5"
              >
                Postuler
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* AI Analysis */}
        {job.relevance_reasoning && (
          <div className="mb-10 p-6 bg-emerald-50/40 rounded-2xl border border-emerald-100/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <Sparkles className="w-4 h-4 text-emerald-700" />
              </div>
              <h3 className="font-bold text-emerald-900 text-sm uppercase tracking-wide">
                Pourquoi ça matche
              </h3>
              {job.relevance_score !== undefined && (
                <span className="ml-auto bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {job.relevance_score}% Match
                </span>
              )}
            </div>
            <div className="prose prose-sm max-w-none text-emerald-900/80 leading-relaxed">
              <p>{job.relevance_reasoning}</p>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              Contrat
            </p>
            <p className="font-semibold text-gray-900">{job.typeContrat}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              Salaire
            </p>
            <p className="font-semibold text-gray-900">
              {job.salaire?.libelle
                ? formatSalary(job.salaire.libelle)
                : "Non spécifié"}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              Expérience
            </p>
            <p className="font-semibold text-gray-900">Non spécifié</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">
              Publié le
            </p>
            <p className="font-semibold text-gray-900">
              {new Date(job.dateCreation).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
          <h3 className=" font-bold text-gray-900 text-xl mb-4">
            Description du poste
          </h3>
          <p className="whitespace-pre-line">{job.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function JobsSearch() {
  const [nlQuery, setNlQuery] = useState("");
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;
  const showDetail = selectedJobId !== null;

  // 2. Scroll to top when clicking a job on mobile
  const handleJobClick = (id: string) => {
    setSelectedJobId(id);
    if (window.innerWidth < 1024) {
      // Mobile: allow default behavior or specific handling
    }
  };

  const handleSmartSearch = async () => {
    // Allow empty query (uses profile)
    // if (!nlQuery.trim()) return;

    setIsLoading(true);
    setJobs([]); // Clear previous results
    setSelectedJobId(null);
    try {
      const results = await jobsService.smartSearch(undefined, nlQuery);
      setJobs(results);
      if (results.length > 0) {
        const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
        if (isDesktop) {
          setSelectedJobId(results[0].id);
        }
      }
    } catch (error) {
      console.error("Smart search failed:", error);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  };

  const handleApply = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, is_applied: true } : j)),
    );
  };

  const quickChips = [
    "CDI Temps Plein",
    "Junior",
    "Tech & IT",
    "Commercial",
    "Nouveaux Jobs",
  ];

  return (
    <div className="h-screen bg-[#FAFAFA] text-gray-900 font-sans flex flex-col overflow-hidden">
      {/* Header & Search */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-serif font-bold text-gray-900 tracking-tight">
                Opportunités
              </h1>
              <p className="text-sm text-gray-500 hidden md:block">
                Trouvez votre prochain défi.
              </p>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Sparkles className="h-5 w-5 text-indigo-500 group-focus-within:text-indigo-600 transition-colors animate-pulse" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all shadow-sm"
                  placeholder="Décrivez votre job idéal avec vos propres mots..."
                  value={nlQuery}
                  onChange={(e) => setNlQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSmartSearch()}
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                  <button
                    onClick={handleSmartSearch}
                    disabled={isLoading}
                    className="p-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Chips */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {quickChips.map((chip) => (
              <button
                key={chip}
                onClick={() => setNlQuery(chip)}
                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-xs font-medium text-gray-600 transition-all whitespace-nowrap"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Split View */}
      <div className="flex-1 min-h-0 w-full max-w-[1600px] mx-auto p-4 md:p-6">
        {jobs.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Left Column: List (Scrollable) */}
            <div
              className={cn(
                "lg:col-span-4 h-full overflow-y-auto custom-scrollbar pr-2 space-y-3 pb-20",
                { "hidden lg:block": selectedJobId },
              )}
            >
              <div className="mb-4 flex items-center justify-between px-1">
                <span className="text-sm font-medium text-gray-500">
                  {jobs.length} résultats
                </span>
              </div>
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={selectedJobId === job.id}
                  onClick={() => handleJobClick(job.id)}
                />
              ))}
            </div>

            {/* Right Column: Detail (Independent Scroll) */}
            <div
              className={cn("lg:col-span-8 h-full overflow-hidden", {
                block: showDetail,
                "hidden lg:block": !showDetail,
              })}
            >
              <JobDetail
                job={selectedJob}
                onBack={() => setSelectedJobId(null)}
                onApply={handleApply}
              />
            </div>
          </div>
        ) : hasSearched && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">
              Aucune opportunité trouvée
            </h3>
            <p className="text-gray-500">
              Essayez de reformuler votre recherche ou d'élargir vos critères.
            </p>
          </div>
        ) : !hasSearched && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto opacity-50">
            <Sparkles className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-400 font-medium">
              Lancez une recherche pour voir les résultats
            </p>
          </div>
        ) : (
          // Loading State
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full animate-pulse">
            <div className="lg:col-span-4 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl" />
              ))}
            </div>
            <div className="hidden lg:block lg:col-span-8">
              <div className="h-full bg-gray-100 rounded-2xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
