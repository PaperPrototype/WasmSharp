
## Deploy to vercel

```sh
pnpm i
pnpm build

# (preview)
vercel build
vercel deploy --prebuilt

# (production)
vercel build --prod
vercel deploy --prebuilt --prod
```

## Development
```sh
pnpm i
pnpm build
pnpm start
```

Only rebuild the packages:
```sh
pnpm init-playground-deps
```

Only rebuild the react playground
```sh
pnpm --filter playground build
```
