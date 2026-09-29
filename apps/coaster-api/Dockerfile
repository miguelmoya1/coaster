# Built from the repository root: docker build -f apps/coaster-api/Dockerfile .
FROM golang:1.27-alpine AS builder
WORKDIR /src

COPY apps/coaster-api/go.mod apps/coaster-api/go.sum ./
RUN go mod download

COPY apps/coaster-api ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /api ./cmd/api

FROM gcr.io/distroless/static:nonroot
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV PUBLIC_DIR=/app/public

COPY --from=builder /api /app/api
COPY apps/coaster-api/public /app/public

EXPOSE 8080
ENTRYPOINT ["/app/api"]
