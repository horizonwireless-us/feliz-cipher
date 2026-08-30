# AGENTS.md — feliz-cipher

## Purpose and visibility

Public repository `horizonwireless-us/feliz-cipher`: the Android library for
YouTube cipher deobfuscation and PoToken generation for Feliz Music. Forked
from `ZemerTeam/zemer-cipher` (upstream remote preserved); the future `origin`
is reserved for `https://github.com/horizonwireless-us/feliz-cipher`.

## Sibling dependencies

- Consumed by `android-client` via Gradle composite build. The default local
  path is `../feliz-cipher`; CI overrides it with `-PfelizCipherPath=.deps/feliz-cipher`.
- `android-client/deps/cipher.lock` pins the exact commit Android expects.
- This repository's `main` branch is the runtime player-config source:
  `https://raw.githubusercontent.com/horizonwireless-us/feliz-cipher/main/...`.

## Package IDs and services

- Maven coordinate stays `com.zemer:cipher` (inherited); do not change without
  an Android release.
- Feliz Music stable package: `com.jtech.felizmusic`; nightly:
  `com.jtech.felizmusic.nightly`.
- Public services: content/search/tracking at `*.horizonwireless.us`.

## Firebase boundary and secrets

- No Firebase configuration lives here. Never add `google-services.json`,
  service-account files, keystores, or cookies. `.gitignore` covers
  `local.properties`, build dirs, and `.kotlin/`.

## Acappella contract

- Canonical names: `isAcappella`, `acappellaOnly`, `onlyAcappella`.
- `onlyAcappella=0`/absent is unrestricted; `1` restricts music to artists
  whose owning-artist `isAcappella` is true. Podcasts are unaffected.
- This repo does not filter content; the contract matters for player configs
  only in that no female/passcode concepts exist here.

## Cipher runtime/config behavior

- `PlayerConfigStore` fetches `player_configs.json` from this repo's `main`
  (6 h TTL + ETag) and force-refreshes on unknown players; bundled asset is the
  offline default. `PlayerDatesStore` fetches `player_dates.json` from `main`.
- Player JSON rotations self-heal at runtime. PoToken or cipher implementation
  changes require an Android release; a config-only push does not.
- The player monitor lives in `.github/workflows/player-monitor.yml`; the
  pure-Node scanner harness is under `monitor/`.

## Build/test commands

```sh
./gradlew :library:testDebugUnitTest
./gradlew :library:assembleRelease
node --test monitor/scan-live-players.test.mjs
```

JDK 21 and Android SDK (platform 35+) are required locally.
