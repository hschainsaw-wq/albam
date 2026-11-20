import type { Album, SortDir, SortKey, Tag, TagGroup, TagMode } from './types';

export type Query = {
  keyword: string;
  tagIds: string[];
  tagMode: TagMode;
  sortKey: SortKey;
  sortDir: SortDir;
};

const norm = (s: string) => s.normalize('NFKC').toLowerCase();

export function matchesKeyword(a: Album, keyword: string): boolean {
  const words = norm(keyword).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = norm([a.title, a.artist, a.memo ?? ''].join('\n'));
  return words.every((w) => hay.includes(w));
}

export function matchesTags(a: Album, tagIds: string[], mode: TagMode): boolean {
  if (tagIds.length === 0) return true;
  return mode === 'and'
    ? tagIds.every((t) => a.tagIds.includes(t))
    : tagIds.some((t) => a.tagIds.includes(t));
}

const collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' });

export function compareAlbums(a: Album, b: Album, key: SortKey, dir: SortDir): number {
  const sign = dir === 'asc' ? 1 : -1;
  if (key === 'title' || key === 'artist') return sign * collator.compare(a[key], b[key]);
  // 未評価・発売日不明は並び順にかかわらず末尾
  const av = a[key];
  const bv = b[key];
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  if (typeof av === 'number' && typeof bv === 'number') return sign * (av - bv);
  return sign * String(av).localeCompare(String(bv));
}

export function runQuery(albums: Album[], q: Query): Album[] {
  return albums
    .filter((a) => matchesKeyword(a, q.keyword) && matchesTags(a, q.tagIds, q.tagMode))
    .sort((a, b) => compareAlbums(a, b, q.sortKey, q.sortDir) || b.addedAt.localeCompare(a.addedAt));
}

export function countByTag(albums: Album[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of albums) for (const t of a.tagIds) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

export type TagSection = { id: string; name: string; tags: Tag[] };

export const compareTagNames = (a: Tag, b: Tag) => collator.compare(a.name, b.name);

/** タグをグループごとにまとめる（グループは並び順、タグは名前順。数字は数値として比較） */
export function groupTags(tags: Tag[], groups: TagGroup[]): TagSection[] {
  const sorted = [...groups].sort((a, b) => a.order - b.order);
  const byName = [...tags].sort(compareTagNames);
  const list: TagSection[] = sorted.map((g) => ({ id: g.id, name: g.name, tags: byName.filter((t) => t.groupId === g.id) }));
  const loose = byName.filter((t) => !t.groupId || !sorted.some((g) => g.id === t.groupId));
  if (loose.length) list.push({ id: '', name: sorted.length ? 'その他' : 'タグ', tags: loose });
  return list.filter((s) => s.tags.length);
}
