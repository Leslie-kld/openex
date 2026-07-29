package com.openx.backend

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.Date
import javax.crypto.SecretKey

@Service
class JwtService(
    @Value("\${app.jwt.secret}") secret: String
) {
    private val secretKey: SecretKey = Keys.hmacShaKeyFor(secret.toByteArray())
    private val expirationMillis = 1000 * 60 * 60 * 24L

    fun generateToken(email: String): String {
        val now = Date()
        val expiry = Date(now.time + expirationMillis)
        return Jwts.builder()
            .subject(email)
            .issuedAt(now)
            .expiration(expiry)
            .signWith(secretKey)
            .compact()
    }

    fun extractEmail(token: String): String {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .payload
            .subject
    }
}