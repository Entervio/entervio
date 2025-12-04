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
}

export const jobsService = {
    search: async (keywords: string, location?: string): Promise<JobOffer[]> => {
        const params = new URLSearchParams({ keywords });
        if (location) params.append("location", location);

        const response = await api.get(`/jobs/search?${params.toString()}`);
        return response.data;
    },

    smartSearch: async (location?: string): Promise<JobOffer[]> => {
        const params = new URLSearchParams();
        if (location) params.append("location", location);

        const response = await api.get(`/jobs/smart-search?${params.toString()}`);
        return response.data;
    },
};
