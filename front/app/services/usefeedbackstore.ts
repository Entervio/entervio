import { create } from "zustand";
import { interviewApi, ApiError } from "~/lib/api";
import type { InterviewSummary } from "~/lib/api";

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
      const data = await interviewApi.getInterviewSummary(interviewId);
      set({ summary: data, loading: false });
    } catch (err) {
      console.error("Error fetching summary:", err);
      
      if (err instanceof ApiError) {
        set({
          error: err.status === 404 
            ? "Résumé non trouvé" 
            : `Erreur: ${err.status}`,
          loading: false,
        });
      } else {
        set({
          error: err instanceof Error ? err.message : "Erreur lors du chargement",
          loading: false,
        });
      }
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