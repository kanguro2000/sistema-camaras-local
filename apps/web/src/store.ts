import { create } from "zustand";

export interface Camera {
  id: string;
  name: string;
  ip: string;
  model?: string;
  username: string;
  hasCredentials: boolean;
  channel: "hd" | "sd";
  rtspPath: string;
  enabled: boolean;
  ptzSupported: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  token: string | null;
  user: { username: string; role: string } | null;
  cameras: Camera[];
  setAuth: (token: string, user: any) => void;
  logout: () => void;
  setCameras: (c: Camera[]) => void;
}

export const useStore = create<AppState>((set) => ({
  token: localStorage.getItem("token"),
  user: null,
  cameras: [],
  setAuth: (token, user) => {
    localStorage.setItem("token", token);
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null, cameras: [] });
  },
  setCameras: (cameras) => set({ cameras }),
}));
