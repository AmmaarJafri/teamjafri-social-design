#!/usr/bin/env bash
# Fresh-clone, offline render test in a container that mirrors the Sunday machine.
#   run 1 (network on):  git clone <committed HEAD of $SRC> && npm ci
#   run 2 (--network none): npm run sample && npm test, images copied to $OUT_HOST
# Env overrides: SRC (git repo to clone, default: this repo), OUT_HOST (default: ./out-container), IMAGE,
#   NODE_VERSION (default: the Dockerfile's, i.e. the Node 24 the Grok machine runs).
# The repo goes in as a git bundle on stdin and images come out as a tar on stdout, so nothing depends on
# which host paths the Docker VM can bind-mount (colima only shares $HOME; other paths mount as empty dirs).
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$(cd "${SRC:-$REPO}" && pwd)"
OUT_HOST="${OUT_HOST:-$REPO/out-container}"
NODE_VERSION="${NODE_VERSION:-}"
IMAGE="${IMAGE:-teamjafri-render-test${NODE_VERSION:+-node$NODE_VERSION}}"
VOL="teamjafri-ws-$(date +%s)-$$"
PLATFORM=linux/amd64

cleanup() { docker volume rm -f "$VOL" >/dev/null 2>&1 || true; }
trap cleanup EXIT

step() { printf '\n==> %s\n' "$*"; }
t0=$SECONDS

docker info >/dev/null 2>&1 || { echo "docker is not reachable (is colima running?)" >&2; exit 1; }
git -C "$SRC" rev-parse --verify HEAD >/dev/null || { echo "$SRC has no commits to clone" >&2; exit 1; }
step "source: $SRC @ $(git -C "$SRC" rev-parse --short HEAD) (committed HEAD only)"

step "build image $IMAGE"
t=$SECONDS
docker build --platform "$PLATFORM" ${NODE_VERSION:+--build-arg NODE_VERSION="$NODE_VERSION"} -t "$IMAGE" "$REPO/docker"
echo "build: $((SECONDS - t))s"

docker volume create "$VOL" >/dev/null

step "run 1 (network on): fresh clone + npm ci"
t=$SECONDS
git -C "$SRC" bundle create -q - HEAD \
| docker run --rm -i --platform "$PLATFORM" -v "$VOL:/workspace" "$IMAGE" bash -euo pipefail -c '
  cat > /tmp/src.bundle
  git -c advice.detachedHead=false clone --quiet /tmp/src.bundle /workspace/teamjafri
  cd /workspace/teamjafri
  echo "node $(node --version), npm $(npm --version), $(google-chrome --version), user $(id -un)"
  npm ci --no-audit --no-fund
'
echo "run 1: $((SECONDS - t))s"

step "run 2 (--network none): npm run sample && npm test"
rm -rf "$OUT_HOST" && mkdir -p "$OUT_HOST"
t=$SECONDS
docker run --rm --platform "$PLATFORM" --network none -v "$VOL:/workspace" "$IMAGE" bash -euo pipefail -c '
  cd /workspace/teamjafri
  {
    echo "node $(node --version), npm $(npm --version), $(google-chrome --version), user $(id -un)"
    if curl -s -m 5 -o /dev/null https://nodejs.org; then echo "network unexpectedly reachable"; exit 1; fi
    npm run sample
    npm test
  } >&2
  tar -C out -cf - .
' | tar -xf - -C "$OUT_HOST"
echo "run 2: $((SECONDS - t))s"

step "PASS in $((SECONDS - t0))s; images:"
find "$OUT_HOST" \( -name '*.jpg' -o -name '*.png' \) | sort
