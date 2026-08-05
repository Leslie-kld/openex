package com.openx.backend

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class RegisterRequest(
    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Must be a valid email")
    val email: String,

    @field:NotBlank(message = "Password is required")
    @field:Size(min = 8, message = "Password must be at least 8 characters")
    val password: String
)

data class LoginRequest(
    @field:NotBlank
    val email: String,
    @field:NotBlank
    val password: String
)

data class AuthResponse(
    val token: String
)