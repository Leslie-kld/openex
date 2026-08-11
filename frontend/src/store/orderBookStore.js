import { create } from 'zustand'

const useOrderBookStore = create((set) => ({
  orders: {}, // keyed by orderId, so updates replace rather than duplicate
  trades: [], // most recent first, capped list

  applyOrderUpdate: (order) =>
    set((state) => {
      const orders = { ...state.orders }
      if (order.status === 'FILLED' || order.status === 'CANCELLED') {
        delete orders[order.orderId]
      } else {
        orders[order.orderId] = order
      }
      return { orders }
    }),

  applyTrade: (trade) =>
    set((state) => ({
      trades: [trade, ...state.trades].slice(0, 20),
    })),
}))

export default useOrderBookStore