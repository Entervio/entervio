import { api } from "~/lib/api";

export interface JobOffer {
  id: string;
  intitule: string;
  description: string;
  dateCreation: string;
  lieuTravail: {
    libelle: string;
  };
  entreprise: {
    nom?: string;
  };
  typeContrat: string;
  salaire?: {
    libelle?: string;
  };
  urlPartner?: string;
  relevance_score?: number;
  relevance_reasoning?: string;
  origineOffre?: {
    urlOrigine?: string;
  };
  contact?: {
    urlPostulation?: string;
  };
  is_applied?: boolean;
}

export interface City {
  nom: string;
  code: string;
  codesPostaux: string[];
  departement?: {
    code: string;
    nom: string;
  };
  region?: {
    code: string;
    nom: string;
  };
}

export const jobsService = {
  search: async (keywords: string, location?: string): Promise<JobOffer[]> => {
    const params = new URLSearchParams({ keywords });
    if (location) params.append("location", location);
    const response = await api.get(`/jobs/search?${params.toString()}`);
    return response.data;
  },

  smartSearch: async (
    location?: string,
    query?: string,
  ): Promise<JobOffer[]> => {
    const params = new URLSearchParams();
    if (location) params.append("location", location);
    if (query) params.append("query", query);
    const response = await api.get(`/jobs/smart-search?${params.toString()}`);
    return response.data;
  },

  searchLocations: async (query: string): Promise<City[]> => {
    const params = new URLSearchParams({ query });
    const response = await api.get(`/jobs/locations?${params.toString()}`);
    return response.data;
  },

  trackApplication: async (
    jobId: string,
    jobTitle: string,
    companyName?: string,
  ): Promise<void> => {
    await api.post("/applications/", {
      job_id: jobId,
      job_title: jobTitle,
      company_name: companyName,
    });
  },

  tailorResume: async (jobDescription: string): Promise<Blob> => {
    const user = await api
      .get("/auth/me")
      .then((r) => r.data)
      .catch(() => null);
    
    if (!user) throw new Error("User not authenticated");

    return api.postBlob("/resume/tailor", {
      user_id: user.id,
      job_description: jobDescription,
    });
  },

  generateCoverLetter: async (jobDescription: string): Promise<Blob> => {
    return api.postBlob("/resume/cover-letter", {
      job_description: jobDescription,
    });
  },
};