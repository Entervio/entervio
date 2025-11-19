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
import { Loader2, ArrowRight, X } from "lucide-react";

export function meta({}: Route.MetaArgs) {
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
    emoji: "😊",
    description: "Un recruteur encourageant qui vous met en confiance",
    gradient: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-400",
    hoverBorder: "hover:border-emerald-500",
  },
  {
    type: "neutral" as InterviewerType,
    label: "Professionnel",
    emoji: "😐",
    description: "Un recruteur objectif et factuel dans ses évaluations",
    gradient: "from-primary to-accent",
    bgColor: "bg-primary-50",
    borderColor: "border-primary-400",
    hoverBorder: "hover:border-primary-500",
  },
  {
    type: "mean" as InterviewerType,
    label: "Exigeant",
    emoji: "😤",
    description: "Un recruteur direct qui teste votre gestion du stress",
    gradient: "from-orange-500 to-red-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-400",
    hoverBorder: "hover:border-orange-500",
  },
];

export default function Setup() {
  const navigate = useNavigate();
  
  // Get state and actions from store
  const {
    candidateName,
    selectedInterviewer,
    error,
    isStarting,
    setCandidateName,
    setSelectedInterviewer,
    startInterview,
  } = useSetupStore();

  const handleStart = async () => {
    const sessionId = await startInterview();
    if (sessionId) {
      navigate(`/interview/${sessionId}`);
    }
  };

  return (
      <div className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Configuration de votre entretien
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Personnalisez votre expérience pour un entraînement optimal
          </p>
        </div>

        {/* Main Setup Card */}
        <Card className="mb-8 border-2 border-gray-200 shadow-lg bg-white">
          <CardContent className="p-8 md:p-10">
            {/* Name Input */}
            <div className="mb-10">
              <Label
                htmlFor="name"
                className="text-lg font-semibold mb-4 block text-gray-900"
              >
                1. Votre identité
              </Label>
              <Input
                id="name"
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Prénom et nom"
                className="text-lg h-14 border-2 border-gray-300 focus:border-primary text-gray-900"
                autoFocus
                disabled={isStarting}
              />
              <p className="text-sm text-gray-600 mt-2">
                Cette information sera utilisée durant l'entretien
              </p>
            </div>

            {/* Interviewer Selection */}
            <div className="mb-10">
              <Label className="text-lg font-semibold mb-4 block text-gray-900">
                2. Profil du recruteur
              </Label>
              <div className="grid md:grid-cols-3 gap-5">
                {INTERVIEWER_CONFIGS.map((config) => (
                  <button
                    key={config.type}
                    onClick={() => setSelectedInterviewer(config.type)}
                    disabled={isStarting}
                    className={cn(
                      "relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group",
                      "hover:scale-[1.02] hover:shadow-xl",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none",
                      selectedInterviewer === config.type
                        ? `${config.borderColor} shadow-xl ${config.bgColor}`
                        : `border-gray-300 ${config.hoverBorder} bg-white`
                    )}
                  >
                    <div className="text-4xl mb-4">{config.emoji}</div>
                    <h3 className="text-xl font-bold mb-2 text-gray-900">
                      {config.label}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {config.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription className="flex items-center text-red-800">
                  <X className="w-5 h-5 mr-2" />
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Start Button */}
            <Button
              onClick={handleStart}
              disabled={!candidateName.trim() || !selectedInterviewer || isStarting}
              className="w-full text-lg h-16 shadow-lg hover:shadow-xl bg-primary hover:bg-primary-600"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Initialisation de l'entretien...
                </>
              ) : (
                <>
                  Lancer l'entretien
                  <ArrowRight className="w-5 h-5 ml-3" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Info Grid */}
        <div className="grid md:grid-cols-2 gap-5">
          {[
            {
              icon: "⏱️",
              title: "Durée estimée",
              desc: "Environ 10-15 minutes pour 5 questions ciblées",
            },
            {
              icon: "🎤",
              title: "Microphone requis",
              desc: "Autorisez l'accès pour des réponses vocales naturelles",
            },
            {
              icon: "💾",
              title: "Sauvegarde automatique",
              desc: "Retrouvez vos entretiens à tout moment via l'historique",
            },
            {
              icon: "📊",
              title: "Feedback détaillé",
              desc: "Analyse approfondie de vos performances en fin de session",
            },
          ].map((item, index) => (
            <Card
              key={index}
              className="border-2 border-gray-200 hover:shadow-lg transition-shadow bg-white"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-900">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1 text-gray-600">
                      {item.desc}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
  );
}