package com.openx.backend

import jakarta.validation.Valid
import jakarta.validation.constraints.DecimalMin
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.util.UUID

data class DepositRequest(
    @field:DecimalMin(value = "0.00000001", message = "Amount must be positive")
    val amount: BigDecimal
)

@RestController
@RequestMapping("/api/wallets")
class WalletController(
    private val userRepository: UserRepository,
    private val accountRepository: AccountRepository,
    private val ledgerService: LedgerService
) {
    

    @PostMapping("/deposit")
    fun deposit(@Valid @RequestBody request: DepositRequest): ResponseEntity<Any> {
        val email = SecurityContextHolder.getContext().authentication?.principal as? String
            ?: throw IllegalStateException("No authenticated user found")

        val user = userRepository.findByEmail(email)
            ?: throw IllegalStateException("User not found for authenticated email")

        val account = accountRepository.findAll()
            .find { it.userId == user.id && it.currency == "USD" }
            ?: return ResponseEntity.status(404).body(mapOf("error" to "No USD account found for this user"))

        val mintAccountId = getOrCreateMintAccount()
        ledgerService.recordTransfer(mintAccountId, account.id, request.amount)

        val newBalance = ledgerService.getBalance(account.id)
        return ResponseEntity.ok(mapOf("newBalance" to newBalance, "currency" to "USD"))
    }

    private fun getOrCreateMintAccount(): UUID {
        val mintUserId = UUID.fromString("00000000-0000-0000-0000-000000000001")
        val existing = accountRepository.findAll().find { it.userId == mintUserId && it.currency == "USD" }
        if (existing != null) return existing.id

        val mintAccount = accountRepository.save(Account(userId = mintUserId, currency = "USD"))
        return mintAccount.id
    }
    @GetMapping
fun getBalance(): ResponseEntity<Any> {
    val email = SecurityContextHolder.getContext().authentication?.principal as? String
        ?: throw IllegalStateException("No authenticated user found")

    val user = userRepository.findByEmail(email)
        ?: throw IllegalStateException("User not found for authenticated email")

    val account = accountRepository.findAll()
        .find { it.userId == user.id && it.currency == "USD" }
        ?: return ResponseEntity.status(404).body(mapOf("error" to "No USD account found"))

    val balance = ledgerService.getBalance(account.id)
    return ResponseEntity.ok(mapOf("balance" to balance, "currency" to "USD"))
}
}