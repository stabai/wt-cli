# TODO: One-line install with prebuilt binaries

## Goal

Provide a one-line install command so users don't need to clone and build:

```bash
curl -fsSL https://raw.githubusercontent.com/stabai/wt-cli/main/install.sh | bash
```

## Requirements

- [ ] GitHub Actions release workflow that builds binaries on tag push
- [ ] Target platforms:
  - macOS arm64 (Apple Silicon)
  - macOS x64 (Intel)
  - Linux x64
  - Linux arm64
  - Windows/WSL x64 (stretch goal)
- [ ] Cross-compile using `bun build --compile --target=bun-{platform}-{arch}`
- [ ] Install script that detects OS/arch and downloads the right binary
- [ ] Update README with one-line install instructions
- [ ] Consider Homebrew tap as a follow-up

## Notes

`bun build --compile` supports cross-compilation targets, so all binaries can
be built from a single CI runner. The shell wrapper function still needs manual
setup (or the install script could offer to append it to the user's shell rc).

## Platforms

Bun compile targets:

| Target | Platform |
|---|---|
| `bun-darwin-arm64` | macOS Apple Silicon |
| `bun-darwin-x64` | macOS Intel |
| `bun-linux-x64` | Linux x64 |
| `bun-linux-arm64` | Linux arm64 |

## Release workflow sketch

```yaml
on:
  push:
    tags: ['v*']

jobs:
  release:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        target: [bun-darwin-arm64, bun-darwin-x64, bun-linux-x64, bun-linux-arm64]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun build --compile --target=${{ matrix.target }} --outfile wt-${{ matrix.target }} src/index.ts
      - uses: softprops/action-gh-release@v2
        with:
          files: wt-${{ matrix.target }}
```
