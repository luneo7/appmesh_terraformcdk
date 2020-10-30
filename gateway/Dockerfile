FROM golang:1.15 AS builder

WORKDIR /src
COPY go.* ./
RUN go mod download

COPY . ./
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix nocgo -o app .

FROM scratch
COPY --from=builder /src/app ./
ENTRYPOINT ["./app"]