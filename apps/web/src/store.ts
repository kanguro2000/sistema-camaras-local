import { create } from "zustand";
import { Camera } from "./domain/entities/camera.js";
import { User } from "./domain/entities/user.js";
import { TokenStorage } from "./domain/repositories/token-storage.js";

export interface AppState {
  token: string | null;
  user: User | null;
  cameras: Camera[];
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setCameras: (c: Camera[]) => void;
}

export function createAppStore(tokenStorage: TokenStorage) {
  return create<AppState>((set) => ({
    token: tokenStorage.get(),
    user: null,
    cameras: [],
    setAuth: (token, user) => {
      tokenStorage.set(token);
      set({ token, user });
    },
    logout: () => {
      tokenStorage.set(null);
      set({ token: null, user: null, cameras: [] });
    },
    setCameras: (cameras) => set({ cameras }),
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;
