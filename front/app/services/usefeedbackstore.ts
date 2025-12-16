import { create } from "zustand";
import { interviewApi, ApiError } from "~/lib/api";
import type { InterviewSummary, InterviewSummaryResponse } from "~/lib/api";

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
      const data: InterviewSummaryResponse = await interviewApi.getInterviewSummary(interviewId);
      let finalSummary: InterviewSummary;

      console.log("data is ", data);

      if (!data) {
        finalSummary = {
          score: 0,
          strengths: [],
          weaknesses: [],
          tips: [],
          overall_comment: "Feedback non disponible.",
          questions: []
        };
        set({ summary: finalSummary, loading: false });
        return;
      }

      // New structure: feedback is an object
      if (data.feedback) {
        finalSummary = {
          score: data.feedback.global_grade ?? 0,
          strengths: data.feedback.strengths || [],
          weaknesses: data.feedback.weaknesses || [],
          tips: data.feedback.tips || [],
          overall_comment: data.feedback.overall_comment || "Aucun commentaire disponible.",
          questions: data.questions || []
        };
      }
      // Feedback is null (interview not ended yet)
      else {
        finalSummary = {
          score: 0,
          strengths: [],
          weaknesses: [],
          tips: [],
          overall_comment: "L'entretien n'est pas encore terminé.",
          questions: data.questions || []
        };
      }

      set({ summary: finalSummary, loading: false });
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