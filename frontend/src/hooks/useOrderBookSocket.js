import { useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import useOrderBookStore from '../store/orderBookStore'

// TODO: move to a Vite env variable (import.meta.env.VITE_WS_URL) before any real deployment,
// and use wss:// for secure origins to avoid mixed-content blocking.
const WS_URL = 'ws://localhost:8080/ws'

function useOrderBookSocket() {
  const applyOrderUpdate = useOrderBookStore((state) => state.applyOrderUpdate)
  const applyTrade = useOrderBookStore((state) => state.applyTrade)

  useEffect(() => {
    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe('/topic/orderbook', (message) => {
          let parsed
          try {
            parsed = JSON.parse(message.body)
          } catch (err) {
            console.error('Failed to parse order book message', err)
            return
          }

          if (parsed.type === 'ORDER_UPDATE') {
            applyOrderUpdate(parsed.data)
          } else if (parsed.type === 'TRADE_EXECUTED') {
            applyTrade(parsed.data)
          }
        })
      },
    })

    client.activate()

    return () => {
      client.deactivate()
    }
  }, [applyOrderUpdate, applyTrade])
}

export default useOrderBookSocket