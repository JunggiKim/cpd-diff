# Contributing

Open an issue before a material behavior or public-schema change. Keep changes focused and add a failing test before implementation.

Run:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
corepack pnpm --filter @cpd-diff/action bundle
git diff --exit-code -- action/dist
```

Do not update pinned engine versions or checksums without linking the official release and independently verifying its digest. By contributing, you agree that your contribution is licensed under Apache-2.0.
