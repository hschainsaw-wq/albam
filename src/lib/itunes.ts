import type { ParsedUrl } from './appleMusicUrl';
import type { Track } from './types';

export type AlbumInfo = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  releaseDate?: string;
  genre?: string;
  trackCount?: number;
  tracks: Track[];
  appleMusicUrl?: string;
  country: string;
};

type LookupResult = {
  wrapperType?: string;
  kind?: string;
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  trackCount?: number;
  collectionViewUrl?: string;
  trackName?: string;
  trackNumber?: number;
  discNumber?: number;
  trackTimeMillis?: number;
};

type LookupResponse = { resultCount: number; results: LookupResult[] };

const ENDPOINT = 'https://itunes.apple.com/lookup';

export class LookupError extends Error {}

/** fetch で呼び、CORS などで失敗したら JSONP で再試行する */
async function lookup(params: Record<string, string>): Promise<LookupResponse> {
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${ENDPOINT}?${qs}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as LookupResponse;
  } catch {
    return jsonp(`${ENDPOINT}?${qs}`);
  }
}

let jsonpSeq = 0;
function jsonp(url: string, timeoutMs = 10000): Promise<LookupResponse> {
  return new Promise((resolve, reject) => {
    const name = `__albamJsonp${Date.now()}_${jsonpSeq++}`;
    const script = document.createElement('script');
    const w = window as unknown as Record<string, unknown>;
    const cleanup = () => {
      clearTimeout(timer);
      delete w[name];
      script.remove();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new LookupError('Apple の API から応答がありませんでした'));
    }, timeoutMs);
    w[name] = (data: LookupResponse) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new LookupError('Apple の API に接続できませんでした'));
    };
    script.src = `${url}&callback=${name}`;
    document.head.appendChild(script);
  });
}

export function largeArtwork(url?: string, size = 600): string | undefined {
  return url?.replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`);
}

export function toAlbumInfo(resp: LookupResponse, country: string): AlbumInfo | null {
  const col = resp.results.find((r) => r.wrapperType === 'collection');
  if (!col || col.collectionId == null) return null;
  const tracks: Track[] = resp.results
    .filter((r) => r.wrapperType === 'track' && r.trackName)
    .map((r) => ({
      disc: r.discNumber ?? 1,
      no: r.trackNumber ?? 0,
      title: r.trackName!,
      durationMs: r.trackTimeMillis,
    }))
    .sort((a, b) => a.disc - b.disc || a.no - b.no);
  return {
    id: String(col.collectionId),
    title: col.collectionName ?? '(不明なアルバム)',
    artist: col.artistName ?? '(不明なアーティスト)',
    artworkUrl: largeArtwork(col.artworkUrl100),
    releaseDate: col.releaseDate,
    genre: col.primaryGenreName,
    trackCount: col.trackCount,
    tracks,
    appleMusicUrl: col.collectionViewUrl?.replace(/[?&]uo=\d+/, ''),
    country,
  };
}

export async function fetchAlbum(parsed: ParsedUrl): Promise<AlbumInfo> {
  let albumId = parsed.id;
  if (parsed.kind === 'song') {
    const song = await lookup({ id: parsed.id, country: parsed.country });
    const cid = song.results[0]?.collectionId;
    if (cid == null) throw new LookupError('この曲の所属アルバムが見つかりませんでした');
    albumId = String(cid);
  }
  const resp = await lookup({ id: albumId, country: parsed.country, entity: 'song', limit: '200' });
  const info = toAlbumInfo(resp, parsed.country);
  if (!info) throw new LookupError('アルバムが見つかりませんでした（国やURLを確認してください）');
  return info;
}
