package com.openx.backend

import tools.jackson.databind.json.JsonMapper
import jakarta.validation.Valid
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*

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

    // Step 1: Have we seen this exact key before? If so, replay the original response.
    val existing = idempotencyKeyRepository.findById(idempotencyKey).orElse(null)
    if (existing != null) {
        val replayedBody = jsonMapper.readValue(existing.responseBody, Map::class.java)
        return ResponseEntity.status(existing.responseStatus).body(replayedBody)
    }

    // Step 2: Validate business rules that span multiple fields
    if (request.orderType == OrderType.LIMIT && request.price == null) {
        val errorBody = mapOf("error" to "Limit orders must include a price")
        saveIdempotencyResult(idempotencyKey, errorBody, 400)
        return ResponseEntity.badRequest().body(errorBody)
    }

    // Step 3: Identify the authenticated user
    val email = SecurityContextHolder.getContext().authentication?.principal as? String
        ?: throw IllegalStateException("No authenticated user found")
    val user = userRepository.findByEmail(email)
        ?: throw IllegalStateException("User not found for authenticated email")

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

    // Step 5: Remember this key + response, so a retry gets the same result instead of a new order
    saveIdempotencyResult(idempotencyKey, responseBody, 200)

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