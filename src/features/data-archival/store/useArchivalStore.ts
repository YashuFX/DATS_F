import { create } from "zustand";
import { SEED_RECORDS } from "../data/seed";
import type { ArchiveRecord, DataTypeId, PriorityId } from "../types";

export interface ManualArchivePayload {
  dataType: DataTypeId;
  source: string;
  mission: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number;
  priority: PriorityId;
  retentionPolicy: string;
}

interface ArchivalState {
  records: ArchiveRecord[];
  manualDialogOpen: boolean;
  setManualDialogOpen: (open: boolean) => void;
  addRecord: (payload: ManualArchivePayload) => void;
}

export const useArchivalStore = create<ArchivalState>((set) => ({
  records: SEED_RECORDS,
  manualDialogOpen: false,
  setManualDialogOpen: (open) => set({ manualDialogOpen: open }),
  addRecord: (payload) => {
    const newRecord: ArchiveRecord = {
      id: `r-${Date.now()}`,
      timestamp: Date.now(),
      dataType: payload.dataType,
      source: payload.source,
      mission: payload.mission,
      fileName: payload.fileName,
      sizeBytes: payload.sizeBytes,
      priority: payload.priority,
      status: "archived",
    };
    set((state) => ({
      records: [newRecord, ...state.records],
    }));
  },
}));
