import type { Color } from './types';

/**
 * `import.meta.env.BASE_URL` is `/` in development and the configured `base`
 * in production. Vite's base is relative (`./`) so the app also works when it
 * is served from a sub-path such as GitHub Pages (`/chessr/`).
 */
export const baseUrl: string = import.meta.env.BASE_URL;

export function publicAsset(path: string): string {
  return `${baseUrl}${path.replace(/^\/+/, '')}`;
}

export function pieceSrc(color: Color, type: string): string {
  return publicAsset(`pieces/staunty/${color}${type.toUpperCase()}.svg`);
}
