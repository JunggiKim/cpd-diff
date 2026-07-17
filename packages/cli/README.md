# cpd-diff

`cpd-diff` fails only when a Git change introduces code duplication.

## Install

Node.js 24 or newer is required.

```bash
npm install --global cpd-diff
```

## Run

```bash
cpd-diff \
  --base origin/main \
  --head HEAD \
  --engine jscpd \
  --engine-path /path/to/jscpd \
  --language typescript \
  --mode changed-lines
```

Use the [GitHub repository](https://github.com/JunggiKim/cpd-diff) for the GitHub Action, full options, and release artifacts.
