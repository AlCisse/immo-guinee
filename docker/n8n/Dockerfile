# Stage 1: Build SSH tools from Alpine
FROM alpine:3.19 AS builder

RUN apk add --no-cache openssh-client jq

# Create a tarball of SSH and all its dependencies
RUN mkdir -p /export/usr/bin /export/lib /export/usr/lib /export/etc/ssh && \
    cp /usr/bin/ssh /usr/bin/ssh-keygen /usr/bin/scp /usr/bin/jq /export/usr/bin/ && \
    cp /lib/ld-musl-*.so.1 /export/lib/ && \
    for lib in $(ldd /usr/bin/ssh 2>/dev/null | grep -oE '/[^ ]+'); do \
        cp "$lib" /export"$lib" 2>/dev/null || true; \
    done && \
    cp /etc/ssh/ssh_config /export/etc/ssh/ 2>/dev/null || true

# Stage 2: Copy tools to n8n image
FROM docker.n8n.io/n8nio/n8n:latest

USER root

# Copy all SSH binaries and libraries
COPY --from=builder /export/ /

# Create .ssh directory
RUN mkdir -p /home/node/.ssh && \
    chown -R node:node /home/node/.ssh && \
    chmod 700 /home/node/.ssh

USER node
