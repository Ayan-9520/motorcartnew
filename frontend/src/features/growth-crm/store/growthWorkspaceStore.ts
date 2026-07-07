import { create } from "zustand";
import { persist } from "zustand/middleware";

type GrowthWorkspaceState = {
  workspaceId: string | null;
  workspaceName: string | null;
  setWorkspace: (id: string | null, name?: string | null) => void;
};

export const useGrowthWorkspaceStore = create<GrowthWorkspaceState>()(
  persist(
    (set) => ({
      workspaceId: null,
      workspaceName: null,
      setWorkspace: (workspaceId, workspaceName = null) =>
        set({ workspaceId, workspaceName }),
    }),
    { name: "growth-workspace" }
  )
);
