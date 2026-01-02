import type { InterviewerType } from "~/types/interview";
import { API_BASE_URL } from "./api";
import { ApiError, withAuthHeaders } from "./api";

export interface FeedbackData {
  overall_comment: string;
  global_grade: number;
  strengths: string[];
  weaknesses: string[];
  tips: string[];
}

export interface QuestionAnswer {
  id: number;
  question: string;
  answer: string | null;
  response_example: string | null;
  grade: number | null;
  feedback: string | null;
}

export interface InterviewSummaryResponse {
  feedback: FeedbackData | null;
  job_description: string;
  interviewer_style: InterviewerType
  questions: QuestionAnswer[];
}

// Keep this for internal use in your store
export interface InterviewSummary {
  score: number;
  strengths: string[];
  weaknesses: string[];
  tips: string[];
  overall_comment: string;
  questions: QuestionAnswer[];
}

export interface InterviewStartRequest {
  candidate_name: string;
  interviewer_type: "nice" | "neutral" | "mean";
  candidate_id?: number;
  job_description?: string;
}

export interface InterviewStartResponse {
  session_id: string;
  candidate_name: string;
  interviewer_style: "nice" | "neutral" | "mean";
}

export interface InterviewInfoResponse {
  session_id: string;
  candidate_name: string;
  interviewer_style: "nice" | "neutral" | "mean";
  question_count: number;
}

export interface ConversationMessage {
  role: string;
  content: string;
}

export interface ConversationHistoryResponse {
  history: ConversationMessage[];
}

export interface InterviewRespondResponse {
  transcription: string;
  response: string;
  question_count: number;
}

export interface InterviewEndResponse {
  summary: string;
}

export interface UploadResumeResponse {
  message: string;
  candidate_id: number;
  name: string;
  skills: any;
}

export interface Interview {
  id: number;
  created_at: string;
  candidate_id: number;
  interviewer_style: string;
  question_count: number;
  grade: number;
  job_description?: string;
}

export interface InterviewSummary {
  score: number;
  strengths: string[];
  weaknesses: string[];
  tips: string[];
  overall_comment: string;
  questions: QuestionAnswer[];
}

export const interviewApi = {
  /**
   * Start a new interview session
   */
  async startInterview(
    data: InterviewStartRequest
  ): Promise<InterviewStartResponse> {
    const response = await fetch(
      `${API_BASE_URL}/interviews/start`,
      withAuthHeaders({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidate_name: data.candidate_name,
          interviewer_type: data.interviewer_type,
          candidate_id: data.candidate_id,
          job_description: data.job_description,
        }),
      }),
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Failed to start interview: ${response.status}`
      );
    }

    return response.json();
  },

  /**
   * Get interview session information
   */
  async getInterviewInfo(sessionId: string): Promise<InterviewInfoResponse> {
    const response = await fetch(
      `${API_BASE_URL}/interviews/${sessionId}/info`,
      withAuthHeaders(),
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        response.status === 404
          ? "Session not found"
          : `Failed to get interview info: ${response.status}`
      );
    }

    return response.json();
  },

  /**
   * Get conversation history for an interview
   */
  async getConversationHistory(
    sessionId: string
  ): Promise<ConversationHistoryResponse> {
    const response = await fetch(
      `${API_BASE_URL}/interviews/${sessionId}/history`,
      withAuthHeaders(),
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Failed to get conversation history: ${response.status}`
      );
    }

    return response.json();
  },

  /**
   * Submit an audio response to the interview
   */
  async submitResponse(
    sessionId: string,
    audioBlob: Blob,
    language: string = "fr"
  ): Promise<InterviewRespondResponse> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("language", language);

    const response = await fetch(
      `${API_BASE_URL}/interviews/${sessionId}/respond`,
      withAuthHeaders({
        method: "POST",
        body: formData,
      }),
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Failed to submit response: ${response.status}`
      );
    }

    return response.json();
  },

  /**
   * End an interview and get summary
   */
  async endInterview(sessionId: string): Promise<InterviewEndResponse> {
    const response = await fetch(
      `${API_BASE_URL}/interviews/${sessionId}/end`,
      withAuthHeaders({
        method: "POST",
      }),
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Failed to end interview: ${response.status}`
      );
    }

    return response.json();
  },

  /**
   * Get audio URL for text-to-speech
   */
  getAudioUrl(sessionId: string, text: string): string {
    return `${API_BASE_URL}/voice/interview/${sessionId}/audio?text=${encodeURIComponent(
      text,
    )}`;
  },

  /**
   * Fetch audio with authentication and return a Blob URL suitable for playback.
   */
  async getAudio(sessionId: string, text: string): Promise<string> {
    const response = await fetch(
      `${API_BASE_URL}/voice/interview/${sessionId}/audio?text=${encodeURIComponent(
        text,
      )}`,
      withAuthHeaders(),
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Failed to get audio: ${response.status}`,
      );
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },

  /**
   * Upload a resume
   */
  async uploadResume(file: File): Promise<UploadResumeResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_BASE_URL}/resume/upload_resume`,
      withAuthHeaders({
        method: "POST",
        body: formData,
      }),
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Failed to upload resume: ${response.status}`
      );
    }

    return response.json();
  },

  /**
   * Get all interviews for the current user
   */
  async getInterviews(): Promise<Interview[]> {
    const response = await fetch(
      `${API_BASE_URL}/interviews/`,
      withAuthHeaders(),
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Failed to get interviews: ${response.status}`
      );
    }

    return response.json();
  },

  /**
   * Get interview summary with feedback and grades
   */
  async getInterviewSummary(interviewId: string): Promise<InterviewSummaryResponse> {
    const response = await fetch(
      `${API_BASE_URL}/interviews/${interviewId}/summary`,
      withAuthHeaders(),
    );
    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Failed to get interview summary: ${response.status}`
      );
    }
    return response.json();
  },

  /**
   * Generate an example response for a specific question in an interview
   */
  async generateExampleResponse(
    interviewId: string,
    questionId: number
  ): Promise<QuestionAnswer> {
    const response = await fetch(
      `${API_BASE_URL}/interviews/${interviewId}/questions/${questionId}/example`,
      withAuthHeaders({
        method: "POST",
      }),
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        response.status === 404
          ? "Question non trouvée"
          : response.status === 403
          ? "Non autorisé"
          : `Erreur lors de la génération: ${response.status}`
      );
    }

    return response.json();
  },
};