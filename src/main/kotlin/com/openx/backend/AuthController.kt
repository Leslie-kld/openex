package com.openx.backend

import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.http.ResponseEntity

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
    private val accountRepository: AccountRepository
) {

    @PostMapping("/register")
    fun register(@RequestBody request: RegisterRequest): ResponseEntity<Any> {
        if (userRepository.findByEmail(request.email) != null) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Email already registered"))
        }

    val user = userRepository.save(
        User(
            email = request.email,
            passwordHash = passwordEncoder.encode(request.password) ?: throw IllegalStateException("Password encoding failed")
    )
)

        // Every new user gets a USD wallet automatically, ready for the Day 3 deposit endpoint
        accountRepository.save(Account(userId = user.id, currency = "USD"))

        val token = jwtService.generateToken(user.email)
        return ResponseEntity.ok(AuthResponse(token))
    }

    @PostMapping("/login")
    fun login(@RequestBody request: LoginRequest): ResponseEntity<Any> {
        val user = userRepository.findByEmail(request.email)
            ?: return ResponseEntity.status(401).body(mapOf("error" to "Invalid credentials"))

        if (!passwordEncoder.matches(request.password, user.passwordHash)) {
            return ResponseEntity.status(401).body(mapOf("error" to "Invalid credentials"))
        }

        val token = jwtService.generateToken(user.email)
        return ResponseEntity.ok(AuthResponse(token))
    }
}