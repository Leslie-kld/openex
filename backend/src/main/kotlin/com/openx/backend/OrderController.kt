package com.openx.backend

import jakarta.validation.Valid
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import tools.jackson.databind.json.JsonMapper

@RestController
@RequestMapping("/api/orders")
class OrderController(
    private val userRepository: UserRepository,
    private val orderRepository: OrderRepository,
    private val idempotencyKeyRepository: IdempotencyKeyRepository,
    private val matchingEngineService: MatchingEngineService,
    private val accountRepository: AccountRepository,
    private val ledgerService: LedgerService,
    private val jsonMapper: JsonMapper
) {

    @PostMapping
    fun createOrder(
        @RequestHeader("Idempotency-Key") idempotencyKey: String,
        @Valid @RequestBody request: CreateOrderRequest
    ): ResponseEntity<Any> {

        val email = SecurityContextHolder.getContext().authentication?.principal as? String
            ?: throw IllegalStateException("No authenticated user found")
        val user = userRepository.findByEmail(email)
            ?: throw IllegalStateException("User not found for authenticated email")

        val scopedKey = "${user.id}:$idempotencyKey"

        val existing = idempotencyKeyRepository.findById(scopedKey).orElse(null)
        if (existing != null) {
            val replayedBody = jsonMapper.readValue(existing.responseBody, Map::class.java)
            return ResponseEntity.status(existing.responseStatus).body(replayedBody)
        }

        if (request.orderType == OrderType.LIMIT && request.price == null) {
            val errorBody = mapOf("error" to "Limit orders must include a price")
            saveIdempotencyResult(scopedKey, errorBody, 400)
            return ResponseEntity.badRequest().body(errorBody)
        }

        // Known limitation: only BUY+LIMIT orders are affordability-checked here, since that's
        // the one case where the exact cost (price x quantity) is known upfront. MARKET orders
        // and SELL orders (which would need per-asset crypto balances we don't track yet) are
        // not checked, and can still result in a negative ledger balance if matched.
        if (request.side == OrderSide.BUY && request.orderType == OrderType.LIMIT) {
            val account = accountRepository.findAll()
                .find { it.userId == user.id && it.currency == "USD" }

            val balance = account?.let { ledgerService.getBalance(it.id) } ?: java.math.BigDecimal.ZERO
            val requiredFunds = request.price!! * request.quantity

            if (balance < requiredFunds) {
                val errorBody = mapOf("error" to "Insufficient balance for this order")
                saveIdempotencyResult(scopedKey, errorBody, 400)
                return ResponseEntity.badRequest().body(errorBody)
            }
        }

        val newOrder = Order(
            userId = user.id,
            side = request.side,
            orderType = request.orderType,
            price = request.price,
            quantity = request.quantity
        )

        val matchedOrder = matchingEngineService.match(newOrder)

        val responseBody = mapOf(
            "id" to matchedOrder.id,
            "side" to matchedOrder.side,
            "orderType" to matchedOrder.orderType,
            "price" to matchedOrder.price,
            "quantity" to matchedOrder.quantity,
            "filledQuantity" to matchedOrder.filledQuantity,
            "status" to matchedOrder.status
        )

        try {
            saveIdempotencyResult(scopedKey, responseBody, 200)
        } catch (e: DataIntegrityViolationException) {
            val winner = idempotencyKeyRepository.findById(scopedKey).orElse(null)
            if (winner != null) {
                val replayedBody = jsonMapper.readValue(winner.responseBody, Map::class.java)
                return ResponseEntity.status(winner.responseStatus).body(replayedBody)
            }
        }

        return ResponseEntity.ok(responseBody)
    }

    private fun saveIdempotencyResult(key: String, body: Any, status: Int) {
        idempotencyKeyRepository.save(
            IdempotencyKey(
                key = key,
                responseBody = jsonMapper.writeValueAsString(body),
                responseStatus = status
            )
        )
    }
}