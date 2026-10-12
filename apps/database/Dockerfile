# Built from the repository root: docker build -f apps/database/Dockerfile .
FROM golang:1.27-alpine AS builder
WORKDIR /src

COPY apps/database/go.mod apps/database/go.sum ./
RUN go mod download

COPY apps/database ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /migrate ./cmd/migrate

FROM gcr.io/distroless/static:nonroot
COPY --from=builder /migrate /app/migrate
ENTRYPOINT ["/app/migrate"]
