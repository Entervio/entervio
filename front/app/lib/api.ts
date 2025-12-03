const API_BASE_URL = "/api/v1";

const ACCESS_TOKEN_KEY = "supabase.access_token";

function withAuthHeaders(init?: RequestInit): RequestInit {
  if (typeof window === "undefined") {
    return init ?? {};
  }
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const baseHeaders: HeadersInit = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const mergedHeaders: HeadersInit = {
    ...baseHeaders,
    ...(init?.headers ?? {}),
  };

  return {
    ...init,
    headers: mergedHeaders,
  };
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
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  grade: number;
  feedback: string;
}

export interface InterviewSummary {
  feedback: string;
  questions: QuestionAnswer[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface SignupResponse {
  id: number;
  email: string;
  name: string;
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
      `${API_BASE_URL}/candidates/upload_resume`,
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
  async getInterviewSummary(interviewId: string): Promise<InterviewSummary> {
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
   * Get job statistics from France Travail
   */
  async getJobStats(codeRome?: string, codeGeographique?: string): Promise<any> {
    const params = new URLSearchParams();
    if (codeRome) params.append("code_rome", codeRome);
    if (codeGeographique) params.append("code_geographique", codeGeographique);

    const response = await fetch(
      `${API_BASE_URL}/jobs/stats?${params.toString()}`,
      withAuthHeaders(),
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Failed to get job stats: ${response.status}`
      );
    }

    return response.json();
  },

  /**
   * Search jobs from France Travail
   */
  async searchJobs(keywords?: string, location?: string): Promise<any> {
    const params = new URLSearchParams();
    if (keywords) params.append("keywords", keywords);
    if (location) params.append("location", location);

    const response = await fetch(
      `${API_BASE_URL}/jobs/search?${params.toString()}`,
      withAuthHeaders(),
    );

    return response.json();
  },

  /**
   * Perform smart job search based on user resume
   */
  async smartSearchJobs(): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/jobs/smart-search`,
      withAuthHeaders({
        method: "POST",
      })
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Failed to perform smart search: ${response.status}`
      );
    }

    return response.json();
  },

  /**
   * Get access to employment stats
   */
  async getAccessStats(codeRome?: string, codeGeographique?: string): Promise<any> {
    const params = new URLSearchParams();
    if (codeRome) params.append("code_rome", codeRome);
    if (codeGeographique) params.append("code_geographique", codeGeographique);

    const response = await fetch(
      `${API_BASE_URL}/jobs/access-stats?${params.toString()}`,
      withAuthHeaders(),
    );

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Failed to fetch access stats: ${response.status}`
      );
    }

    return response.json();
  },
};

export const authApi = {
  async signup(payload: SignupRequest): Promise<SignupResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let message = "Échec de la création du compte";
      try {
        const data = await response.json();
        if (typeof (data as any).detail === "string") {
          message = (data as any).detail;
        } else if ((data as any).detail?.message) {
          message = (data as any).detail.message;
        }
      } catch {
        // ignore JSON parse errors
      }

      throw new ApiError(response.status, message);
    }

    return response.json();
  },
};