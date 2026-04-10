"use client";

import { create } from "zustand";
import {
  ApplicationTrackerItem,
  MatchedJob,
  PortfolioPreview,
  ResumeAnalysis,
  ResumeUploadResponse,
  SkillGapInsight
} from "@/types";

type AppState = {
  upload?: ResumeUploadResponse;
  analysis?: ResumeAnalysis;
  matches: MatchedJob[];
  tracker: ApplicationTrackerItem[];
  portfolio?: PortfolioPreview;
  skillGaps: SkillGapInsight[];
  loading: boolean;
  error?: string;
  setUpload: (upload?: ResumeUploadResponse) => void;
  setAnalysis: (analysis?: ResumeAnalysis) => void;
  setMatches: (matches: MatchedJob[]) => void;
  setTracker: (tracker: ApplicationTrackerItem[]) => void;
  setPortfolio: (portfolio?: PortfolioPreview) => void;
  setSkillGaps: (skillGaps: SkillGapInsight[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  reset: () => void;
};

export const useAppStore = create<AppState>((set: (partial: Partial<AppState>) => void) => ({
  upload: undefined,
  analysis: undefined,
  matches: [],
  tracker: [],
  portfolio: undefined,
  skillGaps: [],
  loading: false,
  error: undefined,
  setUpload: (upload: ResumeUploadResponse | undefined) => set({ upload }),
  setAnalysis: (analysis: ResumeAnalysis | undefined) => set({ analysis }),
  setMatches: (matches: MatchedJob[]) => set({ matches }),
  setTracker: (tracker: ApplicationTrackerItem[]) => set({ tracker }),
  setPortfolio: (portfolio: PortfolioPreview | undefined) => set({ portfolio }),
  setSkillGaps: (skillGaps: SkillGapInsight[]) => set({ skillGaps }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | undefined) => set({ error }),
  reset: () =>
    set({
      upload: undefined,
      analysis: undefined,
      matches: [],
      tracker: [],
      portfolio: undefined,
      skillGaps: [],
      loading: false,
      error: undefined
    })
}));
