# syntax=docker/dockerfile:1.7
# ============================================================================
# Stage 1: Build Frontend with npm dependency caching
# ============================================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy ONLY package manifests first to leverage Docker layer caching
COPY frontend/package.json frontend/package-lock.json* ./

# Cache npm download directory across builds
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy frontend source code and build static assets
COPY frontend/ ./
RUN npm run build

# ============================================================================
# Stage 2: Build Backend with Maven .m2 dependency caching
# ============================================================================
FROM eclipse-temurin:25-jdk-noble AS backend-builder
WORKDIR /build

# Install Maven
RUN apt-get update && apt-get install -y --no-install-recommends maven && rm -rf /var/lib/apt/lists/*

# Copy ONLY pom.xml first to maximize layer caching on git commits
COPY pom.xml .

# Download dependencies into persistent BuildKit .m2 cache mount
# This step is completely cached and SKIPPED on every git commit unless pom.xml changes
RUN --mount=type=cache,target=/root/.m2 \
    mvn dependency:go-offline -B

# Copy backend source code
COPY src ./src

# Integrate frontend production build into Spring Boot static resources
COPY --from=frontend-builder /app/frontend/dist ./src/main/resources/static

# Build production executable JAR using cached .m2 repository
RUN --mount=type=cache,target=/root/.m2 \
    mvn package -DskipTests -B \
    && cp target/w2w-share-1.0.0.jar app.jar

# ============================================================================
# Stage 3: Minimal Production JRE Runtime Container
# ============================================================================
FROM eclipse-temurin:25-jre-noble AS runner
WORKDIR /app

# Install curl for container health check
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Create unprivileged system user for maximum security
RUN groupadd -r w2wgroup && useradd -r -g w2wgroup -m w2wuser \
    && mkdir -p /app/temp-w2w-encrypted && chown -R w2wuser:w2wgroup /app

# Copy compiled JAR from backend builder stage
COPY --from=backend-builder --chown=w2wuser:w2wgroup /build/app.jar app.jar

# Switch to unprivileged user
USER w2wuser

# Expose HTTP & WebSocket port (8080) and UDP Subnet Peer Discovery port (53535)
EXPOSE 8080/tcp
EXPOSE 53535/udp

# Configure production JVM flags for Java 25 Virtual Threads & G1GC
ENV JAVA_OPTS="-XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -Xms256m -Xmx2g -Dspring.threads.virtual.enabled=true"

# Define container health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
