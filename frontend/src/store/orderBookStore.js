import { create } from 'zustand'

const useOrderBookStore = create((set) => ({
  orders: {}, // keyed by orderId, so updates replace rather than duplicate
  trades: [], // most recent first, capped list

  applyOrderUpdate: (order) =>
    set((state) => ({
      orders: { ...state.orders, [order.orderId]: order },
    })),

  applyTrade: (trade) =>
    set((state) => ({
      trades: [trade, ...state.trades].slice(0, 20),
    })),
}))

export default useOrderBookStore