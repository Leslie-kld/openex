package com.openx.backend

import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal
import java.util.UUID

data class DepositRequest(
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
fun deposit(@RequestBody request: DepositRequest): Map<String, Any> {
    val email = SecurityContextHolder.getContext().authentication?.principal as? String
        ?: throw IllegalStateException("No authenticated user found")

    val user = userRepository.findByEmail(email)
        ?: throw IllegalStateException("User not found for authenticated email")

    val account = accountRepository.findAll()
        .first { it.userId == user.id && it.currency == "USD" }

    val mintAccountId = getOrCreateMintAccount()

    ledgerService.recordTransfer(mintAccountId, account.id, request.amount)

    val newBalance = ledgerService.getBalance(account.id)
    return mapOf("newBalance" to newBalance, "currency" to "USD")
}

    private fun getOrCreateMintAccount(): UUID {
        val mintUserId = UUID.fromString("00000000-0000-0000-0000-000000000001")
        val existing = accountRepository.findAll().find { it.userId == mintUserId }
        if (existing != null) return existing.id

        val mintAccount = accountRepository.save(Account(userId = mintUserId, currency = "USD"))
        return mintAccount.id
    }
}