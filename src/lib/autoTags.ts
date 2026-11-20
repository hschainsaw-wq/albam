import { findTagByName, newId } from './reducer';
import type { Data } from './types';

export const DECADE_GROUP = '年代';
export const GENRE_GROUP = 'ジャンル';

export type AutoTag = { group: string; name: string };

/** "1994-03-01T08:00:00Z" → "1990年代" */
export function decadeLabel(releaseDate?: string): string | undefined {
  const y = Number(releaseDate?.slice(0, 4));
  if (!Number.isInteger(y) || y < 1000) return undefined;
  return `${Math.floor(y / 10) * 10}年代`;
}

/** Apple のジャンル名をそのままタグ名にする */
export function genreLabel(genre?: string): string | undefined {
  return genre?.trim() || undefined;
}

export function suggestAutoTags(album: { releaseDate?: string; genre?: string }): AutoTag[] {
  const out: AutoTag[] = [];
  const d = decadeLabel(album.releaseDate);
  if (d) out.push({ group: DECADE_GROUP, name: d });
  const g = genreLabel(album.genre);
  if (g) out.push({ group: GENRE_GROUP, name: g });
  return out;
}

/**
 * アルバムに自動タグを付ける。グループやタグがなければ作る。
 * 同名のタグが既にあれば（別のグループにあっても）それを使う。
 */
export function applyAutoTags(data: Data, albumId: string, autoTags: AutoTag[]): Data {
  if (autoTags.length === 0) return data;
  const album = data.albums.find((a) => a.id === albumId);
  if (!album) return data;
  let { tags, tagGroups } = data;
  const tagIds = [...album.tagIds];

  for (const at of autoTags) {
    let tag = findTagByName(tags, at.name);
    if (!tag) {
      let group = tagGroups.find((g) => g.name === at.group);
      if (!group) {
        group = { id: newId(), name: at.group, order: tagGroups.length };
        tagGroups = [...tagGroups, group];
      }
      tag = { id: newId(), name: at.name, groupId: group.id };
      tags = [...tags, tag];
    }
    if (!tagIds.includes(tag.id)) tagIds.push(tag.id);
  }

  if (tagIds.length === album.tagIds.length && tags === data.tags) return data;
  return {
    ...data,
    tags,
    tagGroups,
    albums: data.albums.map((a) => (a.id === albumId ? { ...a, tagIds } : a)),
  };
}

/** 登録済みの全アルバムに自動タグを付ける。新しく付くタグの数も返す */
export function applyAutoTagsToAll(data: Data): { data: Data; added: number } {
  let next = data;
  let added = 0;
  for (const a of data.albums) {
    const before = next.albums.find((x) => x.id === a.id)!.tagIds.length;
    next = applyAutoTags(next, a.id, suggestAutoTags(a));
    added += next.albums.find((x) => x.id === a.id)!.tagIds.length - before;
  }
  return { data: next, added };
}
