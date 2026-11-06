import { create } from 'zustand';

interface RoomState {
  serverUrl: string;
  token: string;
  connected: boolean;
  connect: (serverUrl: string, token: string) => void;
  disconnect: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  serverUrl: '',
  token: '',
  connected: false,
  connect: (serverUrl, token) => set({ serverUrl, token, connected: true }),
  disconnect: () => set({ serverUrl: '', token: '', connected: false }),
}));
