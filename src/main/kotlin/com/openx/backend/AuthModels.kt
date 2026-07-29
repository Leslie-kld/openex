package com.openx.backend

data class RegisterRequest(
    val email: String,
    val password: String
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class AuthResponse(
    val token: String
)