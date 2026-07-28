package com.openx.backend

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import java.math.BigDecimal
import java.util.UUID

@SpringBootTest
class LedgerServiceTest {

    @Autowired
    lateinit var ledgerService: LedgerService

    @Autowired
    lateinit var accountRepository: AccountRepository

    private fun assertMoneyEquals(expected: BigDecimal, actual: BigDecimal) {
        assertEquals(0, expected.compareTo(actual), "expected $expected but was $actual")
    }

    @Test
    fun `transfer creates balanced debit and credit entries`() {
        val mintUser = UUID.randomUUID()
        val userA = UUID.randomUUID()
        val userB = UUID.randomUUID()

        val mintAccount = accountRepository.save(Account(userId = mintUser, currency = "USD"))
        val accountA = accountRepository.save(Account(userId = userA, currency = "USD"))
        val accountB = accountRepository.save(Account(userId = userB, currency = "USD"))

        ledgerService.recordTransfer(mintAccount.id, accountA.id, BigDecimal("500.00"))
        ledgerService.recordTransfer(accountA.id, accountB.id, BigDecimal("100.00"))

        val balanceMint = ledgerService.getBalance(mintAccount.id)
        val balanceA = ledgerService.getBalance(accountA.id)
        val balanceB = ledgerService.getBalance(accountB.id)

        assertMoneyEquals(BigDecimal("-500.00"), balanceMint)
        assertMoneyEquals(BigDecimal("400.00"), balanceA)
        assertMoneyEquals(BigDecimal("100.00"), balanceB)

        val total = balanceMint.add(balanceA).add(balanceB)
        assertMoneyEquals(BigDecimal.ZERO, total)
    }
}