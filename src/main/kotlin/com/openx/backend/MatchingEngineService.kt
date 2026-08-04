package com.openx.backend

import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
class MatchingEngineService(
    private val orderRepository: OrderRepository,
    private val tradeRepository: TradeRepository,
    private val ledgerService: LedgerService,
    private val accountRepository: AccountRepository,
    private val messagingTemplate: SimpMessagingTemplate
) {

    @Transactional
    fun match(incomingOrder: Order): Order {
        var current = orderRepository.save(incomingOrder)
        broadcastOrderUpdate(current)

        val oppositeSide = if (current.side == OrderSide.BUY) OrderSide.SELL else OrderSide.BUY
        val oppositeOrders = if (oppositeSide == OrderSide.SELL) {
            orderRepository.findByStatusAndSideOrderByPriceAscCreatedAtAsc(OrderStatus.OPEN, OrderSide.SELL)
        } else {
            orderRepository.findByStatusAndSideOrderByPriceDescCreatedAtAsc(OrderStatus.OPEN, OrderSide.BUY)
        }

        for (restingOrder in oppositeOrders) {
            if (current.remainingQuantity <= BigDecimal.ZERO) break

            val pricesCross = when {
                current.orderType == OrderType.MARKET -> true
                restingOrder.orderType == OrderType.MARKET -> true
                current.side == OrderSide.BUY -> current.price!! >= restingOrder.price!!
                else -> current.price!! <= restingOrder.price!!
            }
            if (!pricesCross) break

            val tradePrice = restingOrder.price ?: current.price!!
            val tradeQuantity = minOf(current.remainingQuantity, restingOrder.remainingQuantity)

            val buyOrder = if (current.side == OrderSide.BUY) current else restingOrder
            val sellOrder = if (current.side == OrderSide.SELL) current else restingOrder

            val trade = executeTrade(buyOrder, sellOrder, tradePrice, tradeQuantity)
            broadcastTrade(trade)

            current = orderRepository.save(updateOrderFill(current, tradeQuantity))
            val updatedResting = orderRepository.save(updateOrderFill(restingOrder, tradeQuantity))

            broadcastOrderUpdate(current)
            broadcastOrderUpdate(updatedResting)
        }

        return current
    }

    private fun updateOrderFill(order: Order, additionalFill: BigDecimal): Order {
        val newFilledQuantity = order.filledQuantity + additionalFill
        val newStatus = if (newFilledQuantity >= order.quantity) OrderStatus.FILLED else OrderStatus.OPEN
        return order.copy(filledQuantity = newFilledQuantity, status = newStatus)
    }

    private fun executeTrade(buyOrder: Order, sellOrder: Order, price: BigDecimal, quantity: BigDecimal): Trade {
        val trade = tradeRepository.save(
            Trade(
                buyOrderId = buyOrder.id,
                sellOrderId = sellOrder.id,
                price = price,
                quantity = quantity
            )
        )

        val buyerAccount = accountRepository.findAll()
            .first { it.userId == buyOrder.userId && it.currency == "USD" }
        val sellerAccount = accountRepository.findAll()
            .first { it.userId == sellOrder.userId && it.currency == "USD" }

        val tradeValue = price * quantity
        ledgerService.recordTransfer(buyerAccount.id, sellerAccount.id, tradeValue)

        return trade
    }

    private fun broadcastTrade(trade: Trade) {
        val payload: Any = mapOf(
            "type" to "TRADE_EXECUTED",
            "data" to TradeExecutedMessage(
                tradeId = trade.id,
                price = trade.price,
                quantity = trade.quantity,
                buyOrderId = trade.buyOrderId,
                sellOrderId = trade.sellOrderId
            )
        )
        messagingTemplate.convertAndSend("/topic/orderbook", payload)
    }

    private fun broadcastOrderUpdate(order: Order) {
        val payload: Any = mapOf(
            "type" to "ORDER_UPDATE",
            "data" to OrderUpdateMessage(
                orderId = order.id,
                side = order.side,
                status = order.status,
                filledQuantity = order.filledQuantity,
                remainingQuantity = order.remainingQuantity
            )
        )
        messagingTemplate.convertAndSend("/topic/orderbook", payload)
    }
}