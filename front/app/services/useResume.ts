import { create } from 'zustand'
import { resumeApi } from "~/lib/resumeApi"
import type { ResumeData } from "~/types/resume"

interface ResumeStore {
    resume: ResumeData
    loading: boolean
    error: string | null
    fetchResume: (token: string) => Promise<void>
    saveResume: (token: string) => Promise<void>
    updateField: (field: keyof ResumeData, value: any) => void
    addItem: (listKey: keyof ResumeData, emptyItem: any) => void
    updateItem: (listKey: keyof ResumeData, index: number, field: string, value: any) => void
    removeItem: (listKey: keyof ResumeData, index: number) => void
}

const EMPTY_RESUME: ResumeData = {
    website: "",
    linkedin: "",
    summary: "",
    work_experiences: [],
    educations: [],
    projects: [],
    skills: [],
    languages: [],
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
    resume: EMPTY_RESUME,
    loading: false,
    error: null,

    fetchResume: async () => {
        set({ loading: true, error: null })
        try {
            const data = await resumeApi.getResume()
            set({ resume: data, loading: false })
        } catch (err: any) {
            set({ error: err.message, loading: false })
        }
    },

    saveResume: async () => {
        set({ loading: true, error: null })
        try {
            const currentResume = get().resume
            const updated = await resumeApi.updateResume(currentResume)
            set({ resume: updated, loading: false })
        } catch (err: any) {
            set({ error: err.message, loading: false })
            throw err 
        }
    },

    updateField: (field, value) => 
        set((state) => ({ 
            resume: { ...state.resume, [field]: value } 
        })),

    addItem: (listKey, emptyItem) =>
        set((state) => ({
            resume: { 
                ...state.resume, 
                [listKey]: [...(state.resume[listKey] as any[]), emptyItem] 
            }
        })),

    updateItem: (listKey, index, field, value) =>
        set((state) => {
            const list = [...(state.resume[listKey] as any[])]
            list[index] = { ...list[index], [field]: value }
            return { 
                resume: { ...state.resume, [listKey]: list } 
            }
        }),

    removeItem: (listKey, index) =>
        set((state) => ({
            resume: { 
                ...state.resume, 
                [listKey]: (state.resume[listKey] as any[]).filter((_, i) => i !== index) 
            }
        })),
}))