# Mirrors the Sunday render machine: Debian 13 x86_64, Node 20.19, npm 11, system Google Chrome,
# no extra fonts, non-root user. Root is used at BUILD time only; nothing at runtime needs it.
FROM --platform=linux/amd64 debian:trixie-slim

ARG NODE_VERSION=20.19.6

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl git xz-utils \
 && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
   | tar -xJ -C /usr/local --strip-components=1 --exclude='*.md' --exclude=LICENSE \
 && npm i -g npm@11 \
 && node --version && npm --version

# Chrome stable from Google's .deb; apt pulls in only the deb's own dependencies.
RUN curl -fsSLo /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
 && apt-get update \
 && apt-get install -y --no-install-recommends /tmp/chrome.deb \
 && rm -rf /var/lib/apt/lists/* /tmp/chrome.deb \
 && google-chrome --version

RUN useradd --create-home --uid 1000 grok \
 && mkdir -p /workspace && chown grok:grok /workspace

USER grok
WORKDIR /workspace
