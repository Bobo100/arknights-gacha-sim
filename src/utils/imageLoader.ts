// Pre-import all card images using Vite's import.meta.glob.
// This replaces the CRA require() pattern which Vite does not support.
const imageModules = import.meta.glob<string>(
  '../image/**/*-half.png',
  { eager: true, query: '?url', import: 'default' }
);

const FALLBACK = imageModules['../image/麥哲倫/麥哲倫-half.png'] ?? '';

export function getCardImage(cardName: string): string {
  const key = `../image/${cardName}/${cardName}-half.png`;
  return imageModules[key] ?? FALLBACK;
}
