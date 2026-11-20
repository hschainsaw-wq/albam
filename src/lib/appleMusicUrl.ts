export type ParsedUrl =
  | { kind: 'album'; id: string; country: string }
  | { kind: 'song'; id: string; country: string };

const HOSTS = /(^|\.)(music\.apple\.com|itunes\.apple\.com)$/;

/**
 * Apple Music の共有URLから ID と国コードを取り出す。
 * 対応例:
 *   https://music.apple.com/jp/album/name/1440857781
 *   https://music.apple.com/jp/album/name/1440857781?i=1440857786  (曲 → 所属アルバム)
 *   https://music.apple.com/jp/album/1440857781
 *   https://music.apple.com/jp/song/name/1440857786
 *   https://itunes.apple.com/jp/album/name/id1440857781
 */
export function parseAppleMusicUrl(input: string): ParsedUrl | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (!HOSTS.test(url.hostname)) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  let country = 'jp';
  if (parts[0] && /^[a-z]{2}$/i.test(parts[0])) {
    country = parts.shift()!.toLowerCase();
  }
  const type = parts[0];
  const last = parts[parts.length - 1] ?? '';
  const id = last.replace(/^id/, '');
  if (!/^\d+$/.test(id)) return null;

  // アルバムURLの ?i= は曲を指すが、パスのIDがアルバムなのでそのまま使う
  if (type === 'album') return { kind: 'album', id, country };
  if (type === 'song') return { kind: 'song', id, country };
  return null;
}
