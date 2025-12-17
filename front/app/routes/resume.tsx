import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/resume";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useSetupStore } from "~/services/usesetupstore";
import { authApi } from "~/lib/api";
import { Loader2, CheckCircle, RefreshCw, ArrowRight, FileText, CheckCircle2 } from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Bienvenue - Entervio" },
    { name: "description", content: "Découvrez les avantages d'Entervio" },
  ];
}

export default function ResumeUpload() {
  const navigate = useNavigate();
  const {
    isUploading,
    error,
    uploadResume,
  } = useSetupStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [hasExistingResume, setHasExistingResume] = useState<boolean | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    async function checkResume() {
      try {
        const user = await authApi.getMe();
        setHasExistingResume(user.has_resume);
        // If user already has a resume, skip to step 2 (update mode)
        if (user.has_resume) {
          setStep(2);
        }
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
    }
  };

  const handleStart = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStep(2);
      setIsTransitioning(false);
    }, 600);
  };

  if (hasExistingResume === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Welcome Screen (split layout - for new users only)
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === 1 && !hasExistingResume) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2 overflow-hidden">
        <style>{`
           @keyframes slideOutLeft {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(-100%); opacity: 0; }
          }
          @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }
           @keyframes fadeSlideRight {
            from { opacity: 0; transform: translateX(-24px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-slide-out-left {
            animation: slideOutLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-slide-out-right {
            animation: slideOutRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
           .animate-fade-up {
            opacity: 0;
            animation: fadeSlideUp 0.6s ease-out forwards;
          }
          .animate-fade-right {
            opacity: 0;
            animation: fadeSlideRight 0.6s ease-out forwards;
          }
        `}</style>
        
        {/* Left Panel: The Value Proposition */}
        <div className={`flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-12 bg-white order-1 lg:order-1 ${isTransitioning ? 'animate-slide-out-left' : ''}`}>
          <div className="max-w-lg mx-auto lg:mx-0 space-y-10">
            
            {/* Typography */}
            <div className="space-y-6 animate-fade-up">
              <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-slate-900 leading-tight">
                Maîtrisez votre <span className="text-emerald-600">prochain entretien</span>
              </h1>
              <p className="text-xl text-slate-600 text-balance leading-relaxed">
                Une IA qui analyse votre voix, votre CV et vos réponses pour vous donner un feedback de niveau expert.
              </p>
            </div>

            {/* List Items */}
            <ul className="space-y-4 animate-fade-up" style={{ animationDelay: '150ms' }}>
              {[
                "Questions générées sur-mesure via votre CV",
                "Analyse vocale et feedback instantané",
                "Suivi de progression détaillé"
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-lg text-slate-700">{item}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <div className="pt-4 animate-fade-up" style={{ animationDelay: '300ms' }}>
              <Button
                size="lg"
                onClick={handleStart}
                className="h-12 bg-emerald-700 hover:bg-emerald-800 text-white px-8 text-lg font-medium shadow-lg hover:shadow-emerald-700/20 transition-all"
              >
                Commencer maintenant
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel: The "AI Core" Visual */}
        <div className={`flex flex-col justify-center p-8 lg:p-12 bg-slate-950 order-2 lg:order-2 ${isTransitioning ? 'animate-slide-out-right' : ''}`}>
          <div className="w-full max-w-xl mx-auto font-mono text-sm leading-relaxed animate-fade-right" style={{ animationDelay: '200ms' }}>
            
            {/* Terminal Window Header */}
            <div className="flex items-center gap-2 mb-6 opacity-50">
              <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              <span className="ml-2 text-slate-500 text-xs">ai_core_init.sh</span>
            </div>

            {/* System Log */}
            <div className="space-y-2 text-slate-400">
              <div className="flex gap-3">
                <span className="text-emerald-500 shrink-0">➜</span>
                <span className="text-slate-100">./initialize_core.sh --mode=expert</span>
              </div>
              
              <div className="h-4"></div>

              <div className="flex gap-3 text-slate-500">
                <span className="text-slate-700">[00:00:01]</span>
                <span>Loading language models...</span>
              </div>
              <div className="flex gap-3 text-emerald-500/80">
                <span className="text-slate-700">[00:00:02]</span>
                <span>&gt;&gt; NLP Modules: OK</span>
              </div>
              <div className="flex gap-3 text-emerald-500/80">
                <span className="text-slate-700">[00:00:02]</span>
                <span>&gt;&gt; Speech Synthesis: OK</span>
              </div>
              <div className="flex gap-3 text-slate-500">
                <span className="text-slate-700">[00:00:03]</span>
                <span>Establishing secure connection...</span>
              </div>
               <div className="flex gap-3 text-emerald-500/80">
                <span className="text-slate-700">[00:00:04]</span>
                <span>&gt;&gt; Connection: 204ms (Encrypted)</span>
              </div>
              
              <div className="h-4"></div>
              
              <div className="flex gap-3">
                <span className="text-yellow-500">ⓘ</span>
                <span className="text-slate-300">Ready to analyze input. Waiting for CV upload...</span>
              </div>
              
              <div className="h-2"></div>
              
              <div className="flex gap-2 items-center animate-pulse">
                <span className="text-emerald-500">_</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Resume Upload
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen grid lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Left Panel: Upload Form */}
      <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-20 py-12 bg-white order-1 lg:order-1">
        <div className="max-w-lg mx-auto lg:mx-0 w-full space-y-10">

          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold tracking-tight text-slate-900 leading-tight">
              {hasExistingResume ? "Mettre à jour votre CV" : "Importez votre CV"}
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              {hasExistingResume
                ? "Remplacez votre CV actuel par une version plus récente."
                : "Pour une expérience 100% personnalisée"
              }
            </p>
          </div>

          {/* Upload Zone */}
          <div className="w-full">
            {justUploaded ? (
              <div className="p-10 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-semibold text-emerald-600">
                    CV analysé avec succès !
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Votre profil est maintenant personnalisé.
                  </p>
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
                    border-2 border-dashed cursor-pointer transition-all duration-200 group w-full
                    ${isDragging
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-emerald-500/50 hover:bg-slate-50"
                    }
                    ${isUploading ? "opacity-60 cursor-not-allowed" : ""}
                  `}
                >
                  <div className={`
                    w-20 h-20 rounded-2xl flex items-center justify-center transition-colors
                    ${isDragging ? "bg-emerald-100" : "bg-slate-100 group-hover:bg-slate-200"}
                  `}>
                    {isUploading ? (
                      <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                    ) : hasExistingResume ? (
                      <RefreshCw className="w-10 h-10 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    ) : (
                      <FileText className="w-10 h-10 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    )}
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium text-slate-900">
                      {isUploading
                        ? "Analyse en cours..."
                        : isDragging
                          ? "Déposez votre fichier ici"
                          : hasExistingResume
                            ? "Remplacer mon CV"
                            : "Glissez votre CV ici"
                      }
                    </p>
                    <p className="text-sm text-slate-500">
                      {isUploading
                        ? "Extraction des compétences et expériences..."
                        : "ou cliquez pour parcourir • PDF uniquement"
                      }
                    </p>
                  </div>
                </label>
              </>
            )}

            {error && (
              <p className="text-sm text-red-500 text-center mt-4" aria-live="polite">
                {error}
              </p>
            )}
          </div>

          {/* Footer / Navigation Buttons - Right Aligned */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-100">
             {justUploaded ? (
              <Button
                size="lg"
                onClick={() => navigate("/")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Continuer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/")}
                  className="text-slate-500 hover:text-slate-900"
                >
                  Passer cette étape
                </Button>
                {/* Could add a 'Next' button here if we wanted to allow proceeding without upload, but usually 'Skip' covers it. 
                    If the user forces Next without upload, what happens? 
                    For now, adhering to 'Skip' or proper upload flow. 
                */}
              </>
            )}
          </div>

        </div>
      </div>

      {/* Right Panel: AI Core Visual (Reused) */}
       <div className="hidden lg:flex flex-col justify-center p-12 bg-slate-950 order-2 lg:order-2">
          <div className="w-full max-w-xl mx-auto font-mono text-sm leading-relaxed">
            
            {/* Terminal Window Header */}
            <div className="flex items-center gap-2 mb-6 opacity-50">
              <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              <div className="w-3 h-3 rounded-full bg-slate-700"></div>
              <span className="ml-2 text-slate-500 text-xs">ai_input_stream.sh</span>
            </div>

            {/* System Log */}
            <div className="space-y-2 text-slate-400">
              <div className="flex gap-3">
                <span className="text-emerald-500 shrink-0">➜</span>
                <span className="text-slate-100">./monitor_input.sh --watch</span>
              </div>
              
              <div className="h-4"></div>

              <div className="flex gap-3 text-emerald-500/80">
                <span className="text-slate-700">[10:00:01]</span>
                <span>&gt;&gt; System Ready.</span>
              </div>
              <div className="flex gap-3 text-slate-500">
                 <span className="text-slate-700">[10:00:01]</span>
                 <span>Waiting for candidate data stream...</span>
              </div>
               
              <div className="h-4"></div>
              
              <div className="flex gap-3 items-center">
                 <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                 <span className="text-slate-300">Awaiting PDF file upload...</span>
              </div>

               <div className="h-2"></div>
              
              <div className="flex gap-2 items-center animate-pulse">
                <span className="text-emerald-500">_</span>
              </div>
            </div>
            
          </div>
        </div>

    </div>
  );
}
