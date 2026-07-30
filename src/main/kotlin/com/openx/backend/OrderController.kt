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
    private val jsonMapper: JsonMapper
) {

    @PostMapping
    fun createOrder(
        @RequestHeader("Idempotency-Key") idempotencyKey: String,
        @Valid @RequestBody request: CreateOrderRequest
    ): ResponseEntity<Any> {

        // Step 1: Identify the authenticated user FIRST — needed to scope the idempotency key per user
        val email = SecurityContextHolder.getContext().authentication?.principal as? String
            ?: throw IllegalStateException("No authenticated user found")
        val user = userRepository.findByEmail(email)
            ?: throw IllegalStateException("User not found for authenticated email")

        // Scope the key to this user so two different users can never collide on the same key
        val scopedKey = "${user.id}:$idempotencyKey"

        // Step 2: Have we seen this exact key (for this exact user) before? Replay if so.
        val existing = idempotencyKeyRepository.findById(scopedKey).orElse(null)
        if (existing != null) {
            val replayedBody = jsonMapper.readValue(existing.responseBody, Map::class.java)
            return ResponseEntity.status(existing.responseStatus).body(replayedBody)
        }

        // Step 3: Validate business rules that span multiple fields
        if (request.orderType == OrderType.LIMIT && request.price == null) {
            val errorBody = mapOf("error" to "Limit orders must include a price")
            saveIdempotencyResult(scopedKey, errorBody, 400)
            return ResponseEntity.badRequest().body(errorBody)
        }

        // Step 4: Actually create the order
        val order = orderRepository.save(
            Order(
                userId = user.id,
                side = request.side,
                orderType = request.orderType,
                price = request.price,
                quantity = request.quantity
            )
        )

        val responseBody = mapOf(
            "id" to order.id,
            "side" to order.side,
            "orderType" to order.orderType,
            "price" to order.price,
            "quantity" to order.quantity,
            "status" to order.status
        )

        // Step 5: Claim the idempotency key. If a concurrent identical request already claimed it
        // first, the database's own uniqueness constraint rejects our insert — we catch that and
        // return the winning request's cached response instead, rather than crashing with a 500.
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