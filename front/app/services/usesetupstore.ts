import { create } from "zustand";
import { ApiError } from "~/lib/api";
import { interviewApi } from "~/lib/interviewApi";
import type { InterviewerType } from "~/types/interview";

interface SetupStore {
  candidateName: string;
  selectedInterviewer: InterviewerType | null;
  candidateId: number | null;
  jobDescription: string;
  error: string | null;
  isStarting: boolean;
  isUploading: boolean;

  setCandidateName: (name: string) => void;
  setSelectedInterviewer: (type: InterviewerType) => void;
  setJobDescription: (description: string) => void;
  setError: (error: string | null) => void;
  uploadResume: (file: File) => Promise<void>;
  startInterview: () => Promise<string | null>; // Returns session_id on success
  fetchUserProfile: () => Promise<void>;
  reset: () => void;
}

export const useSetupStore = create<SetupStore>((set, get) => ({
  candidateName: "",
  selectedInterviewer: null,
  candidateId: null,
  jobDescription: "",
  error: null,
  isStarting: false,
  isUploading: false,

  setCandidateName: (name) => {
    set({ candidateName: name, error: null });
  },

  setSelectedInterviewer: (type) => {
    set({ selectedInterviewer: type, error: null });
  },

  setJobDescription: (description) => {
    set({ jobDescription: description, error: null });
  },

  setError: (error) => {
    set({ error });
  },

  fetchUserProfile: async () => {
    try {
      const { authApi } = await import("~/lib/api");
      const user = await authApi.getMe();
      if (user.has_resume) {
        set({
          candidateId: user.id,
          candidateName: `${user.first_name} ${user.last_name}` || get().candidateName
        });
      } else if (user.first_name) {
        set({ candidateName: `${user.first_name} ${user.last_name}` });
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  },

  uploadResume: async (file) => {
    set({ isUploading: true, error: null });

    try {
      const data = await interviewApi.uploadResume(file);
      set({
        candidateId: data.candidate_id,
        candidateName: data.name || get().candidateName,
        isUploading: false
      });
    } catch (err) {
      console.error("Error uploading resume:", err);
      set({
        error: "Échec de l'envoi du CV. Veuillez réessayer.",
        isUploading: false
      });
    }
  },

  startInterview: async () => {
    const { candidateName, selectedInterviewer, candidateId, jobDescription } = get();

    if (!selectedInterviewer) {
      set({ error: "Veuillez sélectionner un type de recruteur" });
      return null;
    }

    set({ isStarting: true, error: null });

    try {
      const data = await interviewApi.startInterview({
        candidate_name: candidateName.trim(),
        interviewer_type: selectedInterviewer,
        candidate_id: candidateId || undefined,
        job_description: jobDescription.trim() || undefined,
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
      candidateId: null,
      jobDescription: "",
      error: null,
      isStarting: false,
    });
  },
}));