# Stage 1: Build SSH tools from Alpine
FROM alpine:3.19 AS builder

RUN apk add --no-cache \
    openssh-client \
    curl \
    jq

# Stage 2: Copy tools to n8n image
FROM docker.n8n.io/n8nio/n8n:latest

USER root

# Copy SSH client and dependencies from Alpine
COPY --from=builder /usr/bin/ssh /usr/bin/ssh
COPY --from=builder /usr/bin/ssh-keygen /usr/bin/ssh-keygen
COPY --from=builder /usr/bin/scp /usr/bin/scp
COPY --from=builder /usr/bin/curl /usr/bin/curl
COPY --from=builder /usr/bin/jq /usr/bin/jq

# Copy required libraries
COPY --from=builder /lib/ld-musl-x86_64.so.1 /lib/ld-musl-x86_64.so.1
COPY --from=builder /usr/lib/libcrypto.so.3 /usr/lib/libcrypto.so.3
COPY --from=builder /usr/lib/libssl.so.3 /usr/lib/libssl.so.3
COPY --from=builder /usr/lib/libcurl.so.4 /usr/lib/libcurl.so.4
COPY --from=builder /usr/lib/libnghttp2.so.14 /usr/lib/libnghttp2.so.14
COPY --from=builder /usr/lib/libbrotlidec.so.1 /usr/lib/libbrotlidec.so.1
COPY --from=builder /usr/lib/libbrotlicommon.so.1 /usr/lib/libbrotlicommon.so.1
COPY --from=builder /usr/lib/libz.so.1 /usr/lib/libz.so.1
COPY --from=builder /usr/lib/libjq.so.1 /usr/lib/libjq.so.1
COPY --from=builder /usr/lib/libonig.so.5 /usr/lib/libonig.so.5

# Create .ssh directory
RUN mkdir -p /home/node/.ssh && \
    chown -R node:node /home/node/.ssh && \
    chmod 700 /home/node/.ssh

USER node
