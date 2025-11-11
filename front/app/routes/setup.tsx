import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/setup";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Configuration - Entretien d'Embauche IA" },
    { name: "description", content: "Configurez votre entretien avec un recruteur IA" },
  ];
}

type InterviewerType = "nice" | "neutral" | "mean";

interface InterviewerOption {
  type: InterviewerType;
  label: string;
  icon: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const interviewerOptions: InterviewerOption[] = [
  {
    type: "nice",
    label: "Bienveillant",
    icon: "😊",
    description: "Un recruteur chaleureux et encourageant qui vous met à l'aise",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
  },
  {
    type: "neutral",
    label: "Neutre",
    icon: "😐",
    description: "Un recruteur professionnel et objectif, factuel dans ses évaluations",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
  },
  {
    type: "mean",
    label: "Exigeant",
    icon: "😤",
    description: "Un recruteur direct et critique qui teste votre résistance au stress",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
  },
];

export default function Setup() {
  const navigate = useNavigate();
  const [candidateName, setCandidateName] = useState("");
  const [selectedInterviewer, setSelectedInterviewer] = useState<InterviewerType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    // Validation
    if (!candidateName.trim()) {
      setError("Veuillez entrer votre nom");
      return;
    }

    if (!selectedInterviewer) {
      setError("Veuillez sélectionner un type de recruteur");
      return;
    }

    // Navigate to interview with parameters
    navigate("/interview", {
      state: {
        candidateName: candidateName.trim(),
        interviewerType: selectedInterviewer,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎯 Entretien d'Embauche IA
          </h1>
          <p className="text-gray-600 text-lg">
            Préparez-vous pour votre prochain entretien
          </p>
        </div>

        {/* Main Setup Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          {/* Name Input */}
          <div className="mb-8">
            <label
              htmlFor="name"
              className="block text-lg font-semibold text-gray-700 mb-3"
            >
              1. Comment vous appelez-vous ?
            </label>
            <input
              id="name"
              type="text"
              value={candidateName}
              onChange={(e) => {
                setCandidateName(e.target.value);
                setError(null);
              }}
              placeholder="Entrez votre nom"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-lg"
              autoFocus
            />
          </div>

          {/* Interviewer Selection */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              2. Choisissez votre type de recruteur
            </label>
            <div className="grid md:grid-cols-3 gap-4">
              {interviewerOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => {
                    setSelectedInterviewer(option.type);
                    setError(null);
                  }}
                  className={`p-6 rounded-xl border-2 transition-all duration-200 text-left hover:scale-105 ${
                    selectedInterviewer === option.type
                      ? `${option.borderColor} ${option.bgColor} shadow-lg`
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-4xl mb-3">{option.icon}</div>
                  <h3 className={`text-xl font-bold mb-2 ${
                    selectedInterviewer === option.type ? option.color : "text-gray-800"
                  }`}>
                    {option.label}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={!candidateName.trim() || !selectedInterviewer}
            className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-indigo-600"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">Commencer l'entretien</span>
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-2xl">⏱️</span>
              Durée
            </h3>
            <p className="text-gray-600 text-sm">
              L'entretien dure environ 5 questions. Prévoyez 10-15 minutes.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-2xl">🎤</span>
              Microphone requis
            </h3>
            <p className="text-gray-600 text-sm">
              Autorisez l'accès à votre microphone pour répondre vocalement aux questions.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              Confidentialité
            </h3>
            <p className="text-gray-600 text-sm">
              Vos réponses ne sont pas enregistrées. Ceci est un outil de pratique.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              Conseil
            </h3>
            <p className="text-gray-600 text-sm">
              Répondez naturellement et prenez votre temps. Il n'y a pas de mauvaises réponses.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>🤖 Propulsé par Groq Whisper • Google Gemini • Edge TTS</p>
          <p className="mt-1 text-xs">
            Entraînez-vous autant de fois que nécessaire pour gagner en confiance
          </p>
        </div>
      </div>
    </div>
  );
}