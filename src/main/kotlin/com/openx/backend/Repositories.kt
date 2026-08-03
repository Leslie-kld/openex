package com.openx.backend

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface AccountRepository : JpaRepository<Account, UUID>

interface LedgerEntryRepository : JpaRepository<LedgerEntry, UUID> {
    fun findByTransactionId(transactionId: UUID): List<LedgerEntry>
    fun findByAccountId(accountId: UUID): List<LedgerEntry>
}

interface UserRepository : JpaRepository<User, UUID> {
    fun findByEmail(email: String): User?
}

interface OrderRepository : JpaRepository<Order, UUID> {
    fun findByUserId(userId: UUID): List<Order>
    fun findByStatusAndSideOrderByPriceDescCreatedAtAsc(status: OrderStatus, side: OrderSide): List<Order>
    fun findByStatusAndSideOrderByPriceAscCreatedAtAsc(status: OrderStatus, side: OrderSide): List<Order>
}

interface IdempotencyKeyRepository : JpaRepository<IdempotencyKey, String>

interface TradeRepository : JpaRepository<Trade, UUID>