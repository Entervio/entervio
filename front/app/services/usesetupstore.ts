import { create } from "zustand";
import { interviewApi, ApiError } from "~/lib/api";
import type { InterviewerType } from "~/types/interview";

interface SetupStore {
  candidateName: string;
  selectedInterviewer: InterviewerType | null;
  error: string | null;
  isStarting: boolean;

  setCandidateName: (name: string) => void;
  setSelectedInterviewer: (type: InterviewerType) => void;
  setError: (error: string | null) => void;
  startInterview: () => Promise<string | null>; // Returns session_id on success
  reset: () => void;
}

export const useSetupStore = create<SetupStore>((set, get) => ({
  candidateName: "",
  selectedInterviewer: null,
  error: null,
  isStarting: false,

  setCandidateName: (name) => {
    set({ candidateName: name, error: null });
  },

  setSelectedInterviewer: (type) => {
    set({ selectedInterviewer: type, error: null });
  },

  setError: (error) => {
    set({ error });
  },

  startInterview: async () => {
    const { candidateName, selectedInterviewer } = get();

    if (!candidateName.trim()) {
      set({ error: "Veuillez entrer votre nom" });
      return null;
    }

    if (!selectedInterviewer) {
      set({ error: "Veuillez sélectionner un type de recruteur" });
      return null;
    }

    set({ isStarting: true, error: null });

    try {
      const data = await interviewApi.startInterview({
        candidate_name: candidateName.trim(),
        interviewer_type: selectedInterviewer,
      });

      set({ isStarting: false });
      return data.session_id;
    } catch (err) {
      console.error("Error starting interview:", err);
      if (err instanceof ApiError) {
        set({
          error:
            err.status === 404
              ? "Service non disponible"
              : "Impossible de démarrer l'entretien. Veuillez réessayer.",
          isStarting: false,
        });
      } else {
        set({
          error: "Impossible de démarrer l'entretien. Veuillez réessayer.",
          isStarting: false,
        });
      }
      return null;
    }
  },

  reset: () => {
    set({
      candidateName: "",
      selectedInterviewer: null,
      error: null,
      isStarting: false,
    });
  },
}));