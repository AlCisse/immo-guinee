FROM docker.n8n.io/n8nio/n8n:latest

USER root

# Install SSH client and required tools
RUN apk --no-cache add \
    openssh-client \
    curl \
    jq

# Create .ssh directory for host key caching
RUN mkdir -p /home/node/.ssh && \
    chown -R node:node /home/node/.ssh && \
    chmod 700 /home/node/.ssh

USER node
