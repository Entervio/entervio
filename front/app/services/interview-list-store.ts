import { create } from "zustand";
import { ApiError } from "~/lib/api";
import { interviewApi, type Interview } from "~/lib/interviewApi";

interface InterviewListStore {
  interviews: Interview[];
  loading: boolean;
  error: string | null;
  fetchInterviews: () => Promise<void>;
  reset: () => void;
}

export const useInterviewListStore = create<InterviewListStore>((set) => ({
  interviews: [],
  loading: true,
  error: null,

  fetchInterviews: async () => {
    set({ loading: true, error: null });

    try {
      const data = await interviewApi.getInterviews();
      set({ interviews: data, loading: false });
    } catch (err) {
      console.error("Failed to fetch interviews:", err);

      if (err instanceof ApiError) {
        set({
          error:
            err.status === 401
              ? "Non autorisé. Veuillez vous connecter."
              : "Erreur lors du chargement des entretiens",
          loading: false,
        });
      } else {
        set({
          error: "Erreur lors du chargement des entretiens",
          loading: false,
        });
      }
    }
  },

  reset: () => {
    set({
      interviews: [],
      loading: true,
      error: null,
    });
  },
}));