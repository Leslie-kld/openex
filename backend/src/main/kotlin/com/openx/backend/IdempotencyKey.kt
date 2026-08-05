package com.openx.backend

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "idempotency_keys")
data class IdempotencyKey(
    @Id
    @Column(name = "key")
    val key: String,

    @Column(name = "response_body", nullable = false, columnDefinition = "TEXT")
    val responseBody: String,

    @Column(name = "response_status", nullable = false)
    val responseStatus: Int,

    @Column(name = "created_at")
    val createdAt: LocalDateTime = LocalDateTime.now()
)