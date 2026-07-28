package com.openx.backend

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

@Service
class LedgerService(
    private val ledgerEntryRepository: LedgerEntryRepository,
    private val accountRepository: AccountRepository
) {

    @Transactional
    fun recordTransfer(fromAccountId: UUID, toAccountId: UUID, amount: BigDecimal): UUID {
        require(amount > BigDecimal.ZERO) { "Transfer amount must be positive" }

        val transactionId = UUID.randomUUID()

        val debitEntry = LedgerEntry(
            transactionId = transactionId,
            accountId = fromAccountId,
            amount = amount,
            direction = EntryDirection.DEBIT
        )

        val creditEntry = LedgerEntry(
            transactionId = transactionId,
            accountId = toAccountId,
            amount = amount,
            direction = EntryDirection.CREDIT
        )

        ledgerEntryRepository.save(debitEntry)
        ledgerEntryRepository.save(creditEntry)

        return transactionId
    }

    fun getBalance(accountId: UUID): BigDecimal {
        val entries = ledgerEntryRepository.findByAccountId(accountId)

        return entries.fold(BigDecimal.ZERO) { total, entry ->
            when (entry.direction) {
                EntryDirection.CREDIT -> total.add(entry.amount)
                EntryDirection.DEBIT -> total.subtract(entry.amount)
            }
        }
    }
}