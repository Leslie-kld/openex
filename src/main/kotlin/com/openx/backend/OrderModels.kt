package com.openx.backend

import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotNull
import java.math.BigDecimal

data class CreateOrderRequest(
    @field:NotNull
    val side: OrderSide,

    @field:NotNull
    val orderType: OrderType,

    val price: BigDecimal? = null,

    @field:NotNull
    @field:DecimalMin(value = "0.00000001", message = "Quantity must be positive")
    val quantity: BigDecimal
)