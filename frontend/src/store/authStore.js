import { create } from 'zustand'

const useAuthStore = create((set) => ({
  token: null,
  email: null,
  setAuth: (token, email) => set({ token, email }),
  logout: () => set({ token: null, email: null }),
}))

export default useAuthStore