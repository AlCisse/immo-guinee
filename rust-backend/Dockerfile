# Multi-stage build for the ImmoGuinée Rust backend (immog-backend + immog-migrate).
#
# Stage 1 compiles a Linux binary (the host is macOS, so binaries must be built
# inside the image). A dependency-cache layer (dummy sources) keeps rebuilds fast:
# only application code recompiles when src/ changes. Debug profile is used for a
# faster/lighter build suitable for local testing (switch to --release for prod).

# syntax=docker/dockerfile:1
# Latest stable Rust: the committed Cargo.lock pulls deps (time, icu_*) that
# require rustc >= 1.88, so pinning 1.85 fails to build. Edition 2024 needs 1.85+,
# which the latest stable satisfies.
FROM rust:1-slim-bookworm AS builder
WORKDIR /app

# Toolchain for the crypto crates (ring: cc/perl; aws-lc-rs: cmake/cc).
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential cmake pkg-config perl \
    && rm -rf /var/lib/apt/lists/*

# The host .cargo/config.toml uses an sccache wrapper (host-only) — disable it and
# cap parallel jobs inside the image so peak memory stays bounded.
ENV RUSTC_WRAPPER=""
ENV SQLX_OFFLINE=true

# --- dependency cache layer: build deps against dummy sources ---
COPY Cargo.toml Cargo.lock ./
RUN mkdir -p .cargo && printf '[build]\njobs = 4\npipelining = true\n' > .cargo/config.toml
RUN mkdir -p src/bin \
    && printf 'fn main(){}' > src/main.rs \
    && printf 'fn main(){}' > src/bin/migrate.rs \
    && printf '' > src/lib.rs
RUN cargo build --bin immog-backend --bin immog-migrate

# --- real build: only the crate recompiles, deps are cached ---
RUN rm -rf src
COPY src ./src
# COPY preserves source mtimes, which can be older than the dummy-build artifacts —
# cargo would then skip recompiling and ship the stub `fn main(){}` binaries. Touch
# all sources so their mtime is newer, forcing a real rebuild (deps stay cached).
RUN find src -type f -exec touch {} + && cargo build --bin immog-backend --bin immog-migrate

# --- runtime: minimal image with just the two binaries ---
FROM debian:bookworm-slim AS runtime
# ca-certificates for TLS; fonts-dejavu-core provides the font the Typst PDF
# renderer loads at runtime (contract generation, US2).
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/debug/immog-backend  /usr/local/bin/immog-backend
COPY --from=builder /app/target/debug/immog-migrate  /usr/local/bin/immog-migrate
EXPOSE 8000
ENTRYPOINT ["immog-backend"]
