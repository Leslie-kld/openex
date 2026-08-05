package com.openx.backend

import java.math.BigDecimal
import java.util.UUID

data class TradeExecutedMessage(
    val tradeId: UUID,
    val price: BigDecimal,
    val quantity: BigDecimal,
    val buyOrderId: UUID,
    val sellOrderId: UUID
)

data class OrderUpdateMessage(
    val orderId: UUID,
    val side: OrderSide,
    val status: OrderStatus,
    val filledQuantity: BigDecimal,
    val remainingQuantity: BigDecimal
)