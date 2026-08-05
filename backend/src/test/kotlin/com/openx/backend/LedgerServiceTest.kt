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

    @Autowired
    lateinit var ledgerEntryRepository: LedgerEntryRepository

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

        val fundingTxId = ledgerService.recordTransfer(mintAccount.id, accountA.id, BigDecimal("500.00"))
        val transferTxId = ledgerService.recordTransfer(accountA.id, accountB.id, BigDecimal("100.00"))

        // Check the actual ledger rows, not just derived balances
        val fundingEntries = ledgerEntryRepository.findByTransactionId(fundingTxId)
        assertEquals(2, fundingEntries.size, "expected exactly one debit and one credit entry")
        val fundingDebit = fundingEntries.single { it.direction == EntryDirection.DEBIT }
        val fundingCredit = fundingEntries.single { it.direction == EntryDirection.CREDIT }
        assertEquals(mintAccount.id, fundingDebit.accountId)
        assertEquals(accountA.id, fundingCredit.accountId)
        assertMoneyEquals(BigDecimal("500.00"), fundingDebit.amount)
        assertMoneyEquals(BigDecimal("500.00"), fundingCredit.amount)

        val transferEntries = ledgerEntryRepository.findByTransactionId(transferTxId)
        assertEquals(2, transferEntries.size, "expected exactly one debit and one credit entry")
        val transferDebit = transferEntries.single { it.direction == EntryDirection.DEBIT }
        val transferCredit = transferEntries.single { it.direction == EntryDirection.CREDIT }
        assertEquals(accountA.id, transferDebit.accountId)
        assertEquals(accountB.id, transferCredit.accountId)

        // Balances should still add up correctly
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