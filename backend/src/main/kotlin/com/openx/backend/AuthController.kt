package com.openx.backend

import jakarta.validation.Valid
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.ResponseEntity
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService,
    private val accountRepository: AccountRepository
) {

    @Transactional
    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): ResponseEntity<Any> {
        val normalizedEmail = request.email.trim().lowercase()

        if (userRepository.findByEmail(normalizedEmail) != null) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Email already registered"))
        }

        val user = try {
            userRepository.save(
                User(
                    email = normalizedEmail,
                    passwordHash = passwordEncoder.encode(request.password)
                        ?: throw IllegalStateException("Password encoding failed")
                )
            )
        } catch (e: DataIntegrityViolationException) {
            return ResponseEntity.badRequest().body(mapOf("error" to "Email already registered"))
        }

        accountRepository.save(Account(userId = user.id, currency = "USD"))

        val token = jwtService.generateToken(user.email)
        return ResponseEntity.ok(AuthResponse(token))
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<Any> {
        val normalizedEmail = request.email.trim().lowercase()
        val user = userRepository.findByEmail(normalizedEmail)

        val passwordMatches = if (user != null) {
            passwordEncoder.matches(request.password, user.passwordHash)
        } else {
            passwordEncoder.matches(request.password, "\$2a\$10\$invalidsaltinvalidsaltinvalidsaltinvalidsa")
            false
        }

        if (user == null || !passwordMatches) {
            return ResponseEntity.status(401).body(mapOf("error" to "Invalid credentials"))
        }

        val token = jwtService.generateToken(user.email)
        return ResponseEntity.ok(AuthResponse(token))
    }
}