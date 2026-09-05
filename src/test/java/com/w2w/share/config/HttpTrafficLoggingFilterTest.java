package com.w2w.share.config;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HttpTrafficLoggingFilterTest {

    private HttpTrafficLoggingFilter filter;

    @BeforeEach
    void setUp() {
        filter = new HttpTrafficLoggingFilter();
    }

    @Test
    void testFilterLogsApiRequests() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/transfer/session/room/123456/status");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(200);

        FilterChain chain = mock(FilterChain.class);
        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertEquals(200, response.getStatus());
    }

    @Test
    void testFilterHandlesErrorResponses() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/transfer/session/by-pin/000000");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(400);

        FilterChain chain = mock(FilterChain.class);
        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertEquals(400, response.getStatus());
    }

    @Test
    void testFilterSkipsActuatorAndStaticAssets() {
        MockHttpServletRequest actuatorReq = new MockHttpServletRequest("GET", "/actuator/health");
        assertTrue(filter.shouldNotFilter(actuatorReq));

        MockHttpServletRequest swaggerReq = new MockHttpServletRequest("GET", "/swagger-ui/index.html");
        assertTrue(filter.shouldNotFilter(swaggerReq));

        MockHttpServletRequest jsReq = new MockHttpServletRequest("GET", "/assets/app.js");
        assertTrue(filter.shouldNotFilter(jsReq));

        MockHttpServletRequest cssReq = new MockHttpServletRequest("GET", "/assets/style.css");
        assertTrue(filter.shouldNotFilter(cssReq));

        MockHttpServletRequest apiReq = new MockHttpServletRequest("GET", "/api/network/info");
        assertFalse(filter.shouldNotFilter(apiReq));
    }
}
