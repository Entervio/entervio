import type { ResumeData } from "~/types/resume";
import { API_BASE_URL, ApiError, withAuthHeaders } from "./api";

export const resumeApi = {
    async getResume() {
        const response = await fetch(
            `${API_BASE_URL}/resume/full`,
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
    updateResume: async (data: ResumeData) => {
        const res = await fetch(
            `${API_BASE_URL}/resume/full`, 
            withAuthHeaders({
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            }),
        );
      
        if (!res.ok) throw new Error("Failed to save")
        return res.json()
    }
}