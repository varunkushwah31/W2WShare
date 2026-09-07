package com.w2w.share.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Concise, high-readability HTTP access logger for W2WShare API requests.
 * Prints structured single-line summaries with method, path, status, and duration.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class HttpTrafficLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(HttpTrafficLoggingFilter.class);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip noisy actuator endpoints, API documentation, and static browser assets
        return path.startsWith("/actuator")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.equals("/favicon.ico")
                || path.endsWith(".js")
                || path.endsWith(".css")
                || path.endsWith(".woff2")
                || path.endsWith(".png")
                || path.endsWith(".svg")
                || path.endsWith(".html");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, @NonNull HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        long startTime = System.currentTimeMillis();
        String method = request.getMethod();
        String uri = request.getRequestURI();
        String queryString = request.getQueryString();
        String fullPath = (queryString != null && !queryString.isBlank()) ? uri + "?" + queryString : uri;

        try {
            filterChain.doFilter(request, response);
        } finally {
            long durationMs = System.currentTimeMillis() - startTime;
            int status = response.getStatus();

            if (status >= 500) {
                log.error("[HTTP-ERROR] {} {} -> {} ({}ms)", method, fullPath, status, durationMs);
            } else if (status >= 400) {
                log.warn("[HTTP-WARN] {} {} -> {} ({}ms)", method, fullPath, status, durationMs);
            } else if (!uri.contains("/chunk/")) {
                log.info("[HTTP] {} {} -> {} ({}ms)", method, fullPath, status, durationMs);
            }
        }
    }
}
