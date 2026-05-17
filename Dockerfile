# syntax=docker/dockerfile:1.7
#
# Production image for Call Calendar.
#
# Single container that serves:
#   - the OpenUI5 SPA at /
#   - the Spring Boot REST API at /admin/** and /public/**
# on the port given by the PORT env var (default 8081 for `docker run`
# without args; Render / Heroku / Hexlet CI override at runtime).
#

# ============================================================
# Stage 1 — Compile the TypeSpec contract and build the SPA.
# ============================================================
FROM node:22 AS frontend
WORKDIR /work

# 1.a — install the TypeSpec compiler (locked via package-lock.json).
COPY package.json package-lock.json ./
RUN npm ci

# 1.b — compile main.tsp -> tsp-output/schema/openapi.yaml. The
#       generated artifact is gitignored, so we always regenerate inside
#       the build so the deployed UI matches the contract HEAD.
COPY main.tsp tspconfig.yaml ./
RUN npm run build

# 1.c — install frontend deps in a separate layer for caching.
WORKDIR /work/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# 1.d — copy frontend sources, regenerate TS types from the freshly
#       compiled OpenAPI document, then produce a deployable SPA bundle.
COPY frontend/ui5.yaml frontend/tsconfig.json ./
COPY frontend/webapp ./webapp
RUN npm run types:generate
RUN npm run build

# ============================================================
# Stage 2 — Build the Spring Boot fat jar with the SPA inlined as
#           classpath-static resources.
# ============================================================
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /work

# 2.a — warm up Maven dependency cache.
COPY backend/pom.xml ./
RUN mvn -B -ntp dependency:go-offline

# 2.b — copy backend source.
COPY backend/src ./src

# 2.c — inject the SPA so Spring serves it at "/" via classpath-static
#       resource handling. Files end up under classpath:/static/ in jar.
COPY --from=frontend /work/frontend/dist ./src/main/resources/static

# 2.d — produce the runnable fat jar.
RUN mvn -B -ntp -DskipTests package

# ============================================================
# Stage 3 — Slim runtime image.
# ============================================================
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /work/target/*.jar /app/app.jar

# PORT is the deploy-platform convention (Render / Heroku / Hexlet CI).
# Default matches `mvn spring-boot:run` locally so `docker run` works
# without env vars too.
ENV PORT=8081
ENV JAVA_OPTS=""
EXPOSE 8081

# Drop root for the running process.
RUN useradd -ms /bin/sh appuser && chown appuser /app
USER appuser

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
