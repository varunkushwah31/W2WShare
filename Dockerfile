# ============================================================================
# Stage 1: Build W2W-Share application using Maven & Eclipse Temurin Java 25
# ============================================================================
FROM eclipse-temurin:25-jdk-noble AS builder
WORKDIR /build

# Copy Maven wrapper / POM and cache dependencies
COPY pom.xml .
COPY src ./src

# Build production executable JAR
RUN apt-get update && apt-get install -y maven \
    && mvn clean package -DskipTests \
    && cp target/w2w-share-1.0.0.jar app.jar

# ============================================================================
# Stage 2: Minimal Production JRE Runtime Container
# ============================================================================
FROM eclipse-temurin:25-jre-noble AS runner
WORKDIR /app

# Create unprivileged system user for security
RUN groupadd -r w2wgroup && useradd -r -g w2wgroup -m w2wuser \
    && mkdir -p /app/temp-w2w-encrypted && chown -R w2wuser:w2wgroup /app

COPY --from=builder --chown=w2wuser:w2wgroup /build/app.jar app.jar

USER w2wuser

EXPOSE 8080

ENV JAVA_OPTS="-XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -Xms256m -Xmx2g"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
