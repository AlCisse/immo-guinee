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
# C5 — build en --release (image de prod). Avant : `cargo build` (debug), binaire
# non optimisé et 3-4× plus lourd. Le cache de deps se fait aussi en release pour
# que la 2e passe ne recompile pas tout.
RUN cargo build --release --bin immog-backend --bin immog-migrate

# --- real build: only the crate recompiles, deps are cached ---
RUN rm -rf src
COPY src ./src
# COPY preserves source mtimes, which can be older than the dummy-build artifacts —
# cargo would then skip recompiling and ship the stub `fn main(){}` binaries. Touch
# all sources so their mtime is newer, forcing a real rebuild (deps stay cached).
RUN find src -type f -exec touch {} + && cargo build --release --bin immog-backend --bin immog-migrate

# --- runtime: minimal image with just the two binaries ---
FROM debian:bookworm-slim AS runtime
# ca-certificates for TLS; fonts-dejavu-core provides the font the Typst PDF
# renderer loads at runtime (contract generation, US2).
# C16 — curl pour le HEALTHCHECK conteneur (sinon debian-slim n'a ni curl ni
# wget). Léger surcoût (~4 Mo) justifié : Docker/le swarm peuvent désormais
# détecter un backend planté et le redémarrer automatiquement.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/immog-backend  /usr/local/bin/immog-backend
COPY --from=builder /app/target/release/immog-migrate  /usr/local/bin/immog-migrate
# C6 — runtime non-root. L'écoute se fait sur le port 8000 (>1024, pas besoin de
# CAP_NET_BIND_SERVICE) donc un utilisateur non-privilégié suffit. On crée un
# utilisateur système dédié (UID/GID 10001, sans home ni shell de login) et on
# veille à ce que les binaires soient exécutables par lui. Réduit le blast radius
# d'une RCE sur le backend (pas de root dans le conteneur).
RUN groupadd --system --gid 10001 immog \
    && useradd --system --uid 10001 --gid immog --no-create-home --shell /usr/sbin/nologin immog \
    && chmod 0755 /usr/local/bin/immog-backend /usr/local/bin/immog-migrate
USER immog:immog
EXPOSE 8000
# C16 — healthcheck conteneur. /api/health/live = liveness bon marché (process
# vivant, sans dépendre de DB/Redis) : un échec => Docker/swarm redémarre le
# backend. On évite /api/health (readiness DB+Redis) : un DB down ne se répare
# pas en redémarrant le backend, et ferait churner le conteneur. start-period
# laisse le temps au binaire de démarrer avant la 1re sonde.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/api/health/live || exit 1
ENTRYPOINT ["immog-backend"]
