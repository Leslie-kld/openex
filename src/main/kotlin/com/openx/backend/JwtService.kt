package com.openx.backend

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Service
import java.util.Date
import javax.crypto.SecretKey

@Service
class JwtService {

    // In a real production system this key would come from an environment variable,
    // never hardcoded — we'll fix that before this goes anywhere public.
    private val secretKey: SecretKey = Keys.hmacShaKeyFor(
        "openex-dev-secret-key-change-this-before-production-use-1234".toByteArray()
    )

    private val expirationMillis = 1000 * 60 * 60 * 24L // 24 hours

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