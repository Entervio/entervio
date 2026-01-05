import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "~/lib/api";
import { CACHE_CONFIG } from "~/config/cache-config";

// Cache TTL from config
const CACHE_TTL = CACHE_CONFIG.JOBS_CACHE_TTL;

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

interface SearchParams {
  keywords?: string;
  location?: string;
  query?: string;
}

interface CachedJobData {
  jobs: JobOffer[];
  timestamp: number;
}

interface JobsState {
  // Cache: Map of search params to job results with timestamps
  jobsCache: Record<string, CachedJobData>;
  
  // Current search state
  currentJobs: JobOffer[];
  isLoading: boolean;
  hasSearched: boolean;
  lastSearchParams: SearchParams | null;
  
  // Actions
  search: (keywords: string, location?: string) => Promise<JobOffer[]>;
  smartSearch: (location?: string, query?: string) => Promise<JobOffer[]>;
  trackApplication: (jobId: string, jobTitle: string, companyName?: string) => Promise<void>;
  markJobAsApplied: (jobId: string) => void;
  tailorResume: (jobDescription: string) => Promise<Blob>;
  generateCoverLetter: (jobDescription: string) => Promise<Blob>;
  
  // Cache management
  getCachedJobs: (params: SearchParams) => JobOffer[] | null;
  clearCache: () => void;
  clearExpiredCache: () => void;
  
  // Reset state
  reset: () => void;
}

// Helper function to create cache key from search params
const getCacheKey = (params: SearchParams): string => {
  const { keywords, location, query } = params;
  const parts = [];
  
  if (keywords) parts.push(`kw:${keywords}`);
  if (location) parts.push(`loc:${location}`);
  if (query) parts.push(`q:${query}`);
  
  return parts.join("|") || "empty";
};

// Helper function to check if cache entry is expired
const isCacheExpired = (timestamp: number, ttl: number = CACHE_TTL): boolean => {
  return Date.now() - timestamp > ttl;
};

export const useJobsStore = create<JobsState>()(
  persist(
    (set, get) => ({
      jobsCache: {},
      currentJobs: [],
      isLoading: false,
      hasSearched: false,
      lastSearchParams: null,

  search: async (keywords: string, location?: string) => {
    const params: SearchParams = { keywords, location };
    const cacheKey = getCacheKey(params);
    
    // Check cache first
    const cachedData = get().jobsCache[cacheKey];
    if (cachedData && !isCacheExpired(cachedData.timestamp)) {
      set({
        currentJobs: cachedData.jobs,
        hasSearched: true,
        lastSearchParams: params,
        isLoading: false,
      });
      return cachedData.jobs;
    }

    // Fetch from API
    set({ isLoading: true, lastSearchParams: params });
    
    try {
      const searchParams = new URLSearchParams({ keywords });
      if (location) searchParams.append("location", location);
      
      const response = await api.get(`/jobs/search?${searchParams.toString()}`);
      const jobs: JobOffer[] = response.data;
      
      // Update cache with timestamp
      set({
        jobsCache: { 
          ...get().jobsCache, 
          [cacheKey]: { jobs, timestamp: Date.now() } 
        },
        currentJobs: jobs,
        isLoading: false,
        hasSearched: true,
      });
      
      return jobs;
    } catch (error) {
      set({ isLoading: false, hasSearched: true });
      throw error;
    }
  },

  smartSearch: async (location?: string, query?: string) => {
    const params: SearchParams = { location, query };
    const cacheKey = getCacheKey(params);
    
    // Check cache first
    const cachedData = get().jobsCache[cacheKey];
    if (cachedData && !isCacheExpired(cachedData.timestamp)) {
      set({
        currentJobs: cachedData.jobs,
        hasSearched: true,
        lastSearchParams: params,
        isLoading: false,
      });
      return cachedData.jobs;
    }

    // Fetch from API
    set({ isLoading: true, lastSearchParams: params });
    
    try {
      const searchParams = new URLSearchParams();
      if (location) searchParams.append("location", location);
      if (query) searchParams.append("query", query);
      
      const response = await api.get(`/jobs/smart-search?${searchParams.toString()}`);
      const jobs: JobOffer[] = response.data;
      
      // Update cache with timestamp
      set({
        jobsCache: { 
          ...get().jobsCache, 
          [cacheKey]: { jobs, timestamp: Date.now() } 
        },
        currentJobs: jobs,
        isLoading: false,
        hasSearched: true,
      });
      
      return jobs;
    } catch (error) {
      set({ isLoading: false, hasSearched: true });
      throw error;
    }
  },

  trackApplication: async (jobId: string, jobTitle: string, companyName?: string) => {
    await api.post("/applications/", {
      job_id: jobId,
      job_title: jobTitle,
      company_name: companyName,
    });
    
    // Mark job as applied in state
    get().markJobAsApplied(jobId);
  },

  markJobAsApplied: (jobId: string) => {
    // Update current jobs
    const updatedJobs = get().currentJobs.map((job) =>
      job.id === jobId ? { ...job, is_applied: true } : job
    );
    
    // Update all caches (preserve timestamps)
    const currentCache = get().jobsCache;
    const newCache: Record<string, CachedJobData> = {};
    
    Object.entries(currentCache).forEach(([key, cachedData]) => {
      newCache[key] = {
        jobs: cachedData.jobs.map((job) =>
          job.id === jobId ? { ...job, is_applied: true } : job
        ),
        timestamp: cachedData.timestamp, // Preserve original timestamp
      };
    });
    
    set({
      currentJobs: updatedJobs,
      jobsCache: newCache,
    });
  },

  tailorResume: async (jobDescription: string) => {
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

  generateCoverLetter: async (jobDescription: string) => {
    return api.postBlob("/resume/cover-letter", {
      job_description: jobDescription,
    });
  },

  getCachedJobs: (params: SearchParams) => {
    const cacheKey = getCacheKey(params);
    const cachedData = get().jobsCache[cacheKey];
    
    if (!cachedData || isCacheExpired(cachedData.timestamp)) {
      return null;
    }
    
    return cachedData.jobs;
  },

  clearCache: () => {
    set({ jobsCache: {} });
  },

  clearExpiredCache: () => {
    const currentCache = get().jobsCache;
    const newCache: Record<string, CachedJobData> = {};
    
    // Keep only non-expired entries
    Object.entries(currentCache).forEach(([key, cachedData]) => {
      if (!isCacheExpired(cachedData.timestamp)) {
        newCache[key] = cachedData;
      }
    });
    
    set({ jobsCache: newCache });
  },

  reset: () => {
    set({
      currentJobs: [],
      isLoading: false,
      hasSearched: false,
      lastSearchParams: null,
    });
  },
}),
{
  name: "jobs-storage", // name of the item in localStorage
  version: 1, // increment this to clear old cache if needed
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    // Only persist these fields
    jobsCache: state.jobsCache,
    currentJobs: state.currentJobs,
    hasSearched: state.hasSearched,
    lastSearchParams: state.lastSearchParams,
    // Don't persist isLoading or _hasHydrated
  }),
}
  )
);