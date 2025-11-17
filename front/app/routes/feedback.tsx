import { useParams } from "react-router";
import { useEffect, useState } from "react";
import type { Route } from "./+types/feedback";

const API_BASE_URL = `http://${
  typeof window !== "undefined" ? window.location.hostname : "localhost"
}:8000/api/v1/voice`;

interface QuestionAnswer {
  question: string;
  answer: string;
  grade: number;
  feedback: string;
}

interface InterviewSummary {
  global_feedback: string;
  questions: QuestionAnswer[];
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Feedback - Entervio" },
    { name: "description", content: "Résumé de votre entretien d'embauche" },
  ];
}

export default function Feedback() {
  const { interviewId } = useParams();
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!interviewId) {
        setError("ID d'entretien manquant");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/interview/${interviewId}/summary`
        );

        if (!response.ok) {
          throw new Error(`Erreur: ${response.status}`);
        }

        const data = await response.json();
        setSummary(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors du chargement"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [interviewId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Chargement du feedback...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Erreur: {error}</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Aucun feedback disponible</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Résumé de l'entretien</h1>

      {/* Global Feedback */}
      <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Feedback Général</h2>
        <p className="text-gray-800 whitespace-pre-wrap">{summary.global_feedback}</p>
      </div>

      {/* Question & Answer Pairs */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold mb-4">Détails par question</h2>
        {summary.questions.map((qa, index) => (
          <div
            key={index}
            className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Question {index + 1}
              </h3>
              <p className="text-gray-700">{qa.question}</p>
            </div>

            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-800 mb-2">
                Votre réponse
              </h4>
              <p className="text-gray-600 italic">{qa.answer}</p>
            </div>

            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-800 mb-2">
                Note
              </h4>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">
                  {qa.grade}
                </span>
                <span className="text-gray-500 ml-1">/10</span>
              </div>
            </div>

            <div>
              <h4 className="text-md font-semibold text-gray-800 mb-2">
                Feedback
              </h4>
              <p className="text-gray-700 whitespace-pre-wrap">{qa.feedback}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}