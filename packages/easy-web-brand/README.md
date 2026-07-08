# @achimismaili/easy-web-brand

Logo trimming and favicon generation for the easy-web ecosystem.

## Install

```bash
pnpm add -D @achimismaili/easy-web-brand
```

## Usage (CLI)

```bash
easy-web-brand trim src/assets/logos
easy-web-brand favicons src/assets/logos --out src/assets/logos/favicons
```

## Usage (API)

```ts
import { trimFolder, generateFaviconsForFolder } from '@achimismaili/easy-web-brand';

await trimFolder('src/assets/logos');
await generateFaviconsForFolder('src/assets/logos', 'src/assets/logos/favicons');
```
