import { useEffect, useState } from "react";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
}

let state: SyncState = { status: "idle", lastSyncedAt: null, errorMessage: null };
const listeners = new Set<(state: SyncState) => void>();

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener(state);
}

export const syncStatusStore = {
  getState: () => state,
  markSyncing: () => setState({ status: "syncing", errorMessage: null }),
  markSynced: () => setState({ status: "synced", lastSyncedAt: new Date(), errorMessage: null }),
  markError: (message: string) => setState({ status: "error", errorMessage: message }),
  subscribe: (listener: (state: SyncState) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useSyncStatus() {
  const [value, setValue] = useState(syncStatusStore.getState());

  useEffect(() => syncStatusStore.subscribe(setValue), []);

  return value;
}
