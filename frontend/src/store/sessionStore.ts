import { create } from "zustand";

type SessionStore = {
  sessionId: string;
};

export const useSessionStore =
  create<SessionStore>(() => ({
    sessionId: crypto.randomUUID(),
  }));