# Built from the repository root: docker build -f apps/coaster-api/Dockerfile .
# /app/api serves the API; /app/migrate applies the migrations (the Cloud Run job and compose).
FROM golang:1.27-alpine AS builder
WORKDIR /src

COPY apps/coaster-api/go.mod apps/coaster-api/go.sum ./
RUN go mod download

COPY apps/coaster-api ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/ ./cmd/...

FROM gcr.io/distroless/static:nonroot
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV PUBLIC_DIR=/app/public

COPY --from=builder /out/ /app/
COPY apps/api/public /app/public

EXPOSE 8080
ENTRYPOINT ["/app/api"]
