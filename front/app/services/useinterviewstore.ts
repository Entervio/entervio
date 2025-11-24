import { create } from "zustand";
import { interviewApi, ApiError } from "~/lib/api";
import type { InterviewerType, Message } from "~/types/interview";

interface InterviewStore {
  sessionId: string | null;
  candidateName: string;
  interviewerType: InterviewerType;
  isRecording: boolean;
  isProcessing: boolean;
  interviewStarted: boolean;
  messages: Message[];
  error: string | null;
  isPlayingAudio: boolean;
  questionCount: number;
  isLoading: boolean;

  // Refs (stored in state for persistence)
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  currentAudio: HTMLAudioElement | null;

  // Actions
  loadInterviewData: (interviewId: string) => Promise<boolean>;
  loadConversationHistory: (interviewId: string) => Promise<void>;
  playAudio: (sessionId: string, text: string) => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  processRecording: () => Promise<void>;
  endInterview: () => Promise<void>;
  setError: (error: string | null) => void;
  cleanup: () => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  candidateName: "",
  interviewerType: "neutral" as InterviewerType,
  isRecording: false,
  isProcessing: false,
  interviewStarted: false,
  messages: [] as Message[],
  error: null,
  isPlayingAudio: false,
  questionCount: 0,
  isLoading: true,
  mediaRecorder: null,
  audioChunks: [] as Blob[],
  currentAudio: null,
};

export const useInterviewStore = create<InterviewStore>((set, get) => ({
  ...initialState,

  loadInterviewData: async (interviewId: string) => {
    try {
      set({ isLoading: true, error: null });

      const data = await interviewApi.getInterviewInfo(interviewId);

      set({
        sessionId: data.session_id,
        candidateName: data.candidate_name,
        interviewerType: data.interviewer_style,
        questionCount: data.question_count,
        interviewStarted: true,
      });

      await get().loadConversationHistory(interviewId);

      set({ isLoading: false });
      return true;
    } catch (err) {
      console.error("Error loading interview:", err);
      if (err instanceof ApiError && err.status === 404) {
        set({
          error: "Session non trouvée. Redirection...",
          isLoading: false,
        });
      } else {
        set({
          error: "Impossible de charger l'entretien.",
          isLoading: false,
        });
      }
      return false;
    }
  },

  loadConversationHistory: async (interviewId: string) => {
    try {
      const data = await interviewApi.getConversationHistory(interviewId);

      const loadedMessages: Message[] = data.history.map((msg, index) => ({
        id: `${Date.now()}-${index}`,
        role: msg.role === "assistant" ? "assistant" : "user",
        text: msg.content,
        timestamp: new Date(),
      }));

      set({ messages: loadedMessages, isLoading: false });

      // Play last message if it's from assistant
      if (loadedMessages.length > 0) {
        const lastMessage = loadedMessages[loadedMessages.length - 1];
        if (lastMessage.role === "assistant") {
          const { sessionId } = get();
          if (sessionId) {
            await get().playAudio(sessionId, lastMessage.text);
          }
        }
      }
    } catch (err) {
      console.error("Error loading conversation history:", err);
    }
  },

  playAudio: async (sessionId: string, text: string) => {
    try {
      set({ isPlayingAudio: true });

      // Stop current audio if playing
      const { currentAudio } = get();
      if (currentAudio) {
        currentAudio.pause();
      }

      const audio = new Audio(interviewApi.getAudioUrl(sessionId, text));
      set({ currentAudio: audio });

      await audio.play();

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          set({ isPlayingAudio: false });
          resolve();
        };
        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          set({ isPlayingAudio: false });
          reject(e);
        };
      });
    } catch (err) {
      console.error("Error playing audio:", err);
      set({ isPlayingAudio: false });
    }
  },

  startRecording: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      set({ audioChunks: [] });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          set((state) => ({
            audioChunks: [...state.audioChunks, event.data],
          }));
        }
      };

      mediaRecorder.onstop = async () => {
        await get().processRecording();
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      set({ mediaRecorder, isRecording: true, error: null });
    } catch (err) {
      console.error("Microphone error:", err);
      set({
        error:
          "Impossible d'accéder au microphone. Veuillez autoriser l'accès.",
      });
    }
  },

  stopRecording: () => {
    const { mediaRecorder, isRecording } = get();
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      set({ isRecording: false });
    }
  },

  processRecording: async () => {
    const { sessionId, audioChunks } = get();
    if (!sessionId || audioChunks.length === 0) {
      return;
    }

    set({ isProcessing: true });

    try {
      const audioBlob = new Blob(audioChunks, {
        type: "audio/webm",
      });

      const data = await interviewApi.submitResponse(sessionId, audioBlob);

      set({ questionCount: data.question_count });

      const userMessage: Message = {
        id: `${Date.now()}-user`,
        role: "user",
        text: data.transcription,
        timestamp: new Date(),
      };

      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        text: data.response,
        timestamp: new Date(),
      };

      set((state) => ({
        messages: [...state.messages, userMessage, assistantMessage],
      }));

      await get().playAudio(sessionId, data.response);

      set({ isProcessing: false });
    } catch (err) {
      console.error("Error processing recording:", err);
      set({
        error:
          "Erreur lors du traitement de votre réponse. Veuillez réessayer.",
        isProcessing: false,
      });
    }
  },

  endInterview: async () => {
    const { sessionId } = get();
    if (!sessionId) return;

    try {
      set({ isProcessing: true });

      await interviewApi.endInterview(sessionId);

      set((state) => ({
        messages: [...state.messages],
        interviewStarted: false,
      }));

      set({ isProcessing: false });

    } catch (err) {
      console.error("Error ending interview:", err);
      set({
        error: "Erreur lors de la fin de l'entretien.",
        isProcessing: false,
      });
    }
  },

  setError: (error) => {
    set({ error });
  },

  cleanup: () => {
    const { currentAudio } = get();
    if (currentAudio) {
      currentAudio.pause();
      set({ currentAudio: null });
    }
  },

  reset: () => {
    get().cleanup();
    set(initialState);
  },
}));