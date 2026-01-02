import { create } from "zustand";
import { ApiError } from "~/lib/api";
import { interviewApi, type InterviewSummary, type InterviewSummaryResponse, type QuestionAnswer } from "~/lib/interviewApi";

interface InterviewContextData {
  job_description?: string;
  interviewer_style?: string;
}

interface FeedbackStore {
  summary: InterviewSummary | null;
  interviewContext: InterviewContextData | null;
  loading: boolean;
  error: string | null;
  generatingExampleForQuestion: number | null;
  fetchSummary: (interviewId: string) => Promise<void>;
  generateExampleResponse: (interviewId: string, questionId: number) => Promise<void>;
  reset: () => void;
}

export const useFeedbackStore = create<FeedbackStore>((set, get) => ({
  summary: null,
  interviewContext: null,
  loading: true,
  error: null,
  generatingExampleForQuestion: null,

  fetchSummary: async (interviewId: string) => {
    if (!interviewId) {
      set({ error: "ID d'entretien manquant", loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const data: InterviewSummaryResponse = await interviewApi.getInterviewSummary(interviewId);
      let finalSummary: InterviewSummary;
      let context: InterviewContextData | null = null;

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
        set({ summary: finalSummary, interviewContext: null, loading: false });
        return;
      }

      // Extract interview context from the response
      context = {
        job_description: data.job_description,
        interviewer_style: data.interviewer_style,
      };

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

      set({ summary: finalSummary, interviewContext: context, loading: false });
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

  generateExampleResponse: async (interviewId: string, questionId: number) => {
    const { summary } = get();
    
    if (!summary) {
      console.error("No summary available");
      return;
    }

    // Mark this question as currently generating
    set({ generatingExampleForQuestion: questionId });

    try {
      const updatedQuestion: QuestionAnswer = await interviewApi.generateExampleResponse(
        interviewId,
        questionId
      );

      // Update the specific question in the summary
      const updatedQuestions = summary.questions.map((q) =>
        q.id === questionId ? updatedQuestion : q
      );

      set({
        summary: {
          ...summary,
          questions: updatedQuestions,
        },
        generatingExampleForQuestion: null,
      });
    } catch (err) {
      console.error("Error generating example response:", err);
      set({ generatingExampleForQuestion: null });
      
      // Optionally, you could set an error message here
      // For now, we'll just log it
      if (err instanceof ApiError) {
        console.error(`API Error ${err.status}: Failed to generate example`);
      }
    }
  },

  reset: () => {
    set({
      summary: null,
      interviewContext: null,
      loading: true,
      error: null,
      generatingExampleForQuestion: null,
    });
  },
}));