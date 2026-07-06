import { create } from 'zustand'

type ChatGenerationStore = {
  active: Record<string, () => void>
  register: (chatId: string, stop: () => void) => () => void
  stop: (chatId: string) => void
}

export const useChatGenerationStore = create<ChatGenerationStore>()((set, get) => ({
  active: {},
  register: (chatId, stop) => {
    set((state) => ({
      active: {
        ...state.active,
        [chatId]: stop,
      },
    }))

    return () => {
      set((state) => {
        if (state.active[chatId] !== stop) return {}

        const { [chatId]: _stop, ...active } = state.active
        return { active }
      })
    }
  },
  stop: (chatId) => {
    get().active[chatId]?.()
  },
}))
