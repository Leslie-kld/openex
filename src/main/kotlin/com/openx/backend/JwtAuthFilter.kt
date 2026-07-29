package com.openx.backend

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthFilter(
    private val jwtService: JwtService
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val authHeader = request.getHeader("Authorization")

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            val token = authHeader.substring(7)
            try {
                val email = jwtService.extractEmail(token)
                val authentication = UsernamePasswordAuthenticationToken(email, null, emptyList())
                SecurityContextHolder.getContext().authentication = authentication
            } catch (e: Exception) {
                // Invalid or expired token — leave the request unauthenticated,
                // Spring Security will reject it if the endpoint requires auth
            }
        }

        filterChain.doFilter(request, response)
    }
}