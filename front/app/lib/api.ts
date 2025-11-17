const API_BASE_URL = `http://${
  typeof window !== "undefined" ? window.location.hostname : "localhost"
}:8000/api/v1/voice`;

export interface InterviewStartRequest {
  candidate_name: string;
  interviewer_type: "nice" | "neutral" | "mean";
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

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const interviewApi = {
  /**
   * Start a new interview session
   */
  async startInterview(
    data: InterviewStartRequest
  ): Promise<InterviewStartResponse> {
    const response = await fetch(`${API_BASE_URL}/interview/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        candidate_name: data.candidate_name,
        interviewer_type: data.interviewer_type,
      }),
    });

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
      `${API_BASE_URL}/interview/${sessionId}/info`
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
      `${API_BASE_URL}/interview/${sessionId}/history`
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
      `${API_BASE_URL}/interview/${sessionId}/respond`,
      {
        method: "POST",
        body: formData,
      }
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
    const response = await fetch(`${API_BASE_URL}/interview/${sessionId}/end`, {
      method: "POST",
    });

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
    return `${API_BASE_URL}/interview/${sessionId}/audio?text=${encodeURIComponent(
      text
    )}`;
  },
};

export { ApiError };