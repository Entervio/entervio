import { create } from "zustand";

const API_BASE_URL = "/api/v1/interviews";

interface QuestionAnswer {
  question: string;
  answer: string;
  grade: number;
  feedback: string;
}

interface InterviewSummary {
  feedback: string;
  questions: QuestionAnswer[];
}

interface FeedbackStore {
  summary: InterviewSummary | null;
  loading: boolean;
  error: string | null;

  fetchSummary: (interviewId: string) => Promise<void>;
  reset: () => void;
}

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  summary: null,
  loading: true,
  error: null,

  fetchSummary: async (interviewId: string) => {
    if (!interviewId) {
      set({ error: "ID d'entretien manquant", loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const response = await fetch(
        `${API_BASE_URL}/${interviewId}/summary`
      );

      if (!response.ok) {
        throw new Error(`Erreur: ${response.status}`);
      }

      const data = await response.json();
      set({ summary: data, loading: false });
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Erreur lors du chargement",
        loading: false,
      });
    }
  },

  reset: () => {
    set({
      summary: null,
      loading: true,
      error: null,
    });
  },
}));