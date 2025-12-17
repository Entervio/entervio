export const API_BASE_URL = "/api/v1";

const ACCESS_TOKEN_KEY = "supabase.access_token";

export function withAuthHeaders(init?: RequestInit): RequestInit {
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
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface SignupResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export const api = {
  get: async (url: string, init?: RequestInit) => {
    const response = await fetch(`${API_BASE_URL}${url}`, withAuthHeaders(init));
    if (!response.ok) {
      throw new ApiError(response.status, `GET ${url} failed: ${response.status}`);
    }
    return { data: await response.json() };
  },
  post: async (url: string, body: any, init?: RequestInit) => {
    const response = await fetch(`${API_BASE_URL}${url}`, withAuthHeaders({
      ...init,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      body: JSON.stringify(body),
    }));
    if (!response.ok) {
      throw new ApiError(response.status, `POST ${url} failed: ${response.status}`);
    }
    return { data: await response.json() };
  },
  postBlob: async (url: string, body: any, init?: RequestInit) => {
    const response = await fetch(`${API_BASE_URL}${url}`, withAuthHeaders({
      ...init,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      body: JSON.stringify(body),
    }));

    if (!response.ok) {
      throw new ApiError(response.status, `POST ${url} failed: ${response.status}`);
    }

    return response.blob();
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

  async getMe(): Promise<{ id: number; email: string; first_name: string; last_name: string; has_resume: boolean; phone: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, withAuthHeaders());

    if (!response.ok) {
      throw new ApiError(response.status, `Failed to get user profile: ${response.status}`);
    }

    return response.json();
  },

  async updateMe(first_name: string, last_name: string, phone: string): Promise<{id: number, first_name: string, last_name: string, phone: string, email: string, has_resume: boolean}> {
    const response = await fetch(
      `${API_BASE_URL}/auth/me`,{
      method: "PUT",
      headers: {"Content-Type": "application/json",
        ...withAuthHeaders().headers},
      body: JSON.stringify({
        first_name,
        last_name,
        phone,
      })
      }
    )
    if (!response.ok) {
      throw new ApiError(response.status, `Failed to get user profile: ${response.status}`);
    }

    return response.json();
  }
};