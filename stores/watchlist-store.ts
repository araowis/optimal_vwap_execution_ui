import { create } from "zustand";

import {
  addInstrument,
  archiveWatchlist,
  createWatchlist,
  deleteWatchlist,
  getWatchlist,
  getWatchlists,
  removeInstrument,
  setCalibration,
  updateWatchlist,
} from "@/lib/watchlist-service";

import {
  AddInstrumentRequest,
  CreateWatchlistRequest,
  UpdateWatchlistRequest,
  Watchlist,
} from "@/lib/watchlist-types";

interface WatchlistStore {
  watchlists: Watchlist[];

  selectedWatchlist: Watchlist | null;

  loading: boolean;

  error: string | null;

  fetchWatchlists: (clientId: string) => Promise<void>;

  fetchWatchlist: (
    clientId: string,
    watchlistId: string
  ) => Promise<void>;

  createWatchlist: (
    clientId: string,
    payload: CreateWatchlistRequest
  ) => Promise<void>;

  updateWatchlist: (
    clientId: string,
    watchlistId: string,
    payload: UpdateWatchlistRequest
  ) => Promise<void>;

  archiveWatchlist: (
    clientId: string,
    watchlistId: string
  ) => Promise<void>;

  deleteWatchlist: (
    clientId: string,
    watchlistId: string
  ) => Promise<void>;

  addInstrument: (
    clientId: string,
    watchlistId: string,
    payload: AddInstrumentRequest
  ) => Promise<void>;

  removeInstrument: (
    clientId: string,
    watchlistId: string,
    instrumentKey: string
  ) => Promise<void>;

  setCalibration: (
    clientId: string,
    watchlistId: string,
    instrumentKey: string,
    isCalibrated: boolean
  ) => Promise<void>;

  clearError: () => void;
}

export const useWatchlistStore = create<WatchlistStore>((set) => ({
  watchlists: [],

  selectedWatchlist: null,

  loading: false,

  error: null,

  clearError: () => set({ error: null }),

  fetchWatchlists: async (clientId) => {
    try {
      set({ loading: true, error: null });

      const watchlists = await getWatchlists(clientId);

      set({
        watchlists,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch watchlists",
      });
    }
  },

  fetchWatchlist: async (clientId, watchlistId) => {
    try {
      set({ loading: true, error: null });

      const watchlist = await getWatchlist(
        clientId,
        watchlistId
      );

      set({
        selectedWatchlist: watchlist,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch watchlist",
      });
    }
  },

  createWatchlist: async (clientId, payload) => {
    try {
      set({ loading: true, error: null });

      const created = await createWatchlist(
        clientId,
        payload
      );

      set((state) => ({
        watchlists: [...state.watchlists, created],
        loading: false,
      }));
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to create watchlist",
      });
    }
  },

  updateWatchlist: async (
    clientId,
    watchlistId,
    payload
  ) => {
    try {
      set({ loading: true, error: null });

      const updated = await updateWatchlist(
        clientId,
        watchlistId,
        payload
      );

      set((state) => ({
        watchlists: state.watchlists.map((w) =>
          w.watchlistId === watchlistId ? updated : w
        ),

        selectedWatchlist:
          state.selectedWatchlist?.watchlistId ===
          watchlistId
            ? updated
            : state.selectedWatchlist,

        loading: false,
      }));
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to update watchlist",
      });
    }
  },

  archiveWatchlist: async (
    clientId,
    watchlistId
  ) => {
    try {
      set({ loading: true, error: null });

      await archiveWatchlist(clientId, watchlistId);

      set((state) => ({
        watchlists: state.watchlists.filter(
          (w) => w.watchlistId !== watchlistId
        ),
        loading: false,
      }));
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to archive watchlist",
      });
    }
  },

  deleteWatchlist: async (
    clientId,
    watchlistId
  ) => {
    try {
      set({ loading: true, error: null });

      await deleteWatchlist(clientId, watchlistId);

      set((state) => ({
        watchlists: state.watchlists.filter(
          (w) => w.watchlistId !== watchlistId
        ),

        selectedWatchlist:
          state.selectedWatchlist?.watchlistId ===
          watchlistId
            ? null
            : state.selectedWatchlist,

        loading: false,
      }));
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to delete watchlist",
      });
    }
  },

  addInstrument: async (
    clientId,
    watchlistId,
    payload
  ) => {
    try {
      set({ loading: true, error: null });

      const updated = await addInstrument(
        clientId,
        watchlistId,
        payload
      );

      set((state) => ({
        watchlists: state.watchlists.map((w) =>
          w.watchlistId === watchlistId ? updated : w
        ),

        selectedWatchlist:
          state.selectedWatchlist?.watchlistId ===
          watchlistId
            ? updated
            : state.selectedWatchlist,

        loading: false,
      }));
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to add instrument",
      });
    }
  },

  removeInstrument: async (
    clientId,
    watchlistId,
    instrumentKey
  ) => {
    try {
      set({ loading: true, error: null });

      await removeInstrument(
        clientId,
        watchlistId,
        instrumentKey
      );

      const updated = await getWatchlist(
        clientId,
        watchlistId
      );

      set((state) => ({
        watchlists: state.watchlists.map((w) =>
          w.watchlistId === watchlistId ? updated : w
        ),

        selectedWatchlist:
          state.selectedWatchlist?.watchlistId ===
          watchlistId
            ? updated
            : state.selectedWatchlist,

        loading: false,
      }));
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to remove instrument",
      });
    }
  },

  setCalibration: async (
    clientId,
    watchlistId,
    instrumentKey,
    isCalibrated
  ) => {
    try {
      set({ loading: true, error: null });

      await setCalibration(
        clientId,
        watchlistId,
        instrumentKey,
        {
          isCalibrated,
        }
      );

      const updated = await getWatchlist(
        clientId,
        watchlistId
      );

      set((state) => ({
        watchlists: state.watchlists.map((w) =>
          w.watchlistId === watchlistId ? updated : w
        ),

        selectedWatchlist:
          state.selectedWatchlist?.watchlistId ===
          watchlistId
            ? updated
            : state.selectedWatchlist,

        loading: false,
      }));
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to update calibration",
      });
    }
  },
}));