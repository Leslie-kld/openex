import { useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import useOrderBookStore from '../store/orderBookStore'

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
          const parsed = JSON.parse(message.body)
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