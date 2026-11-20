import type { Album, Data, Tag, TagGroup } from './types';

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const now = () => new Date().toISOString();

export type AlbumPatch = Partial<Omit<Album, 'id' | 'addedAt'>>;

export type Action =
  | { type: 'load'; data: Data }
  | { type: 'addAlbum'; album: Album }
  | { type: 'updateAlbum'; id: string; patch: AlbumPatch }
  | { type: 'deleteAlbum'; id: string }
  | { type: 'addTag'; tag: Tag }
  | { type: 'renameTag'; id: string; name: string }
  | { type: 'setTagGroup'; id: string; groupId?: string }
  | { type: 'deleteTag'; id: string }
  | { type: 'mergeTag'; from: string; into: string }
  | { type: 'addGroup'; group: TagGroup }
  | { type: 'renameGroup'; id: string; name: string }
  | { type: 'moveGroup'; id: string; delta: -1 | 1 }
  | { type: 'deleteGroup'; id: string }
  | { type: 'import'; data: Data; mode: 'replace' | 'merge' };

const sameName = (a: string, b: string) =>
  a.normalize('NFKC').trim().toLowerCase() === b.normalize('NFKC').trim().toLowerCase();

export function findTagByName(tags: Tag[], name: string): Tag | undefined {
  return tags.find((t) => sameName(t.name, name));
}

export function reducer(state: Data, action: Action): Data {
  switch (action.type) {
    case 'load':
      return action.data;

    case 'addAlbum':
      if (state.albums.some((a) => a.id === action.album.id)) return state;
      return { ...state, albums: [...state.albums, action.album] };

    case 'updateAlbum':
      return {
        ...state,
        albums: state.albums.map((a) =>
          a.id === action.id ? { ...a, ...action.patch, updatedAt: now() } : a,
        ),
      };

    case 'deleteAlbum':
      return { ...state, albums: state.albums.filter((a) => a.id !== action.id) };

    case 'addTag':
      if (findTagByName(state.tags, action.tag.name)) return state;
      return { ...state, tags: [...state.tags, action.tag] };

    case 'renameTag': {
      const name = action.name.trim();
      if (!name) return state;
      const clash = findTagByName(state.tags, name);
      if (clash && clash.id !== action.id) return state;
      return { ...state, tags: state.tags.map((t) => (t.id === action.id ? { ...t, name } : t)) };
    }

    case 'setTagGroup':
      return {
        ...state,
        tags: state.tags.map((t) => (t.id === action.id ? { ...t, groupId: action.groupId } : t)),
      };

    case 'deleteTag':
      return {
        ...state,
        tags: state.tags.filter((t) => t.id !== action.id),
        albums: state.albums.map((a) =>
          a.tagIds.includes(action.id) ? { ...a, tagIds: a.tagIds.filter((t) => t !== action.id) } : a,
        ),
      };

    case 'mergeTag': {
      const { from, into } = action;
      if (from === into) return state;
      return {
        ...state,
        tags: state.tags.filter((t) => t.id !== from),
        albums: state.albums.map((a) => {
          if (!a.tagIds.includes(from)) return a;
          const rest = a.tagIds.filter((t) => t !== from);
          return { ...a, tagIds: rest.includes(into) ? rest : [...rest, into] };
        }),
      };
    }

    case 'addGroup':
      if (state.tagGroups.some((g) => sameName(g.name, action.group.name))) return state;
      return { ...state, tagGroups: [...state.tagGroups, action.group] };

    case 'renameGroup': {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        tagGroups: state.tagGroups.map((g) => (g.id === action.id ? { ...g, name } : g)),
      };
    }

    case 'moveGroup': {
      const sorted = [...state.tagGroups].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((g) => g.id === action.id);
      const j = i + action.delta;
      if (i < 0 || j < 0 || j >= sorted.length) return state;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      return { ...state, tagGroups: sorted.map((g, order) => ({ ...g, order })) };
    }

    case 'deleteGroup':
      return {
        ...state,
        tagGroups: state.tagGroups.filter((g) => g.id !== action.id),
        tags: state.tags.map((t) => (t.groupId === action.id ? { ...t, groupId: undefined } : t)),
      };

    case 'import':
      return action.mode === 'replace' ? action.data : mergeData(state, action.data);
  }
}

/**
 * 既存データに取り込みデータを追加する。
 * - タググループ・タグは名前で照合し、同名は既存を使う
 * - 既存アルバムはタグを足し合わせ、評価・メモは既存が空のときだけ取り込む
 */
export function mergeData(base: Data, incoming: Data): Data {
  const tagGroups = [...base.tagGroups];
  const groupMap = new Map<string, string>();
  for (const g of [...incoming.tagGroups].sort((a, b) => a.order - b.order)) {
    const hit = tagGroups.find((x) => sameName(x.name, g.name));
    if (hit) groupMap.set(g.id, hit.id);
    else {
      const id = tagGroups.some((x) => x.id === g.id) ? newId() : g.id;
      tagGroups.push({ ...g, id, order: tagGroups.length });
      groupMap.set(g.id, id);
    }
  }

  const tags = [...base.tags];
  const tagMap = new Map<string, string>();
  for (const t of incoming.tags) {
    const hit = findTagByName(tags, t.name);
    if (hit) tagMap.set(t.id, hit.id);
    else {
      const id = tags.some((x) => x.id === t.id) ? newId() : t.id;
      tags.push({ ...t, id, groupId: t.groupId ? groupMap.get(t.groupId) : undefined });
      tagMap.set(t.id, id);
    }
  }

  const albums = [...base.albums];
  for (const a of incoming.albums) {
    const tagIds = a.tagIds.map((t) => tagMap.get(t)).filter((t): t is string => !!t);
    const i = albums.findIndex((x) => x.id === a.id);
    if (i < 0) {
      albums.push({ ...a, tagIds });
    } else {
      const cur = albums[i];
      albums[i] = {
        ...cur,
        tagIds: [...new Set([...cur.tagIds, ...tagIds])],
        rating: cur.rating ?? a.rating,
        memo: cur.memo?.trim() ? cur.memo : a.memo,
      };
    }
  }
  return { version: 1, albums, tags, tagGroups };
}

/** インポートするJSONを検証する。不正なら例外 */
export function parseBackup(text: string): Data {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('JSONとして読み込めませんでした');
  }
  const d = raw as Partial<Data>;
  if (!d || d.version !== 1 || !Array.isArray(d.albums) || !Array.isArray(d.tags)) {
    throw new Error('albam のバックアップファイルではありません');
  }
  for (const a of d.albums) {
    if (typeof a?.id !== 'string' || typeof a.title !== 'string' || !Array.isArray(a.tagIds)) {
      throw new Error('アルバムのデータが壊れています');
    }
  }
  return { version: 1, albums: d.albums, tags: d.tags, tagGroups: d.tagGroups ?? [] };
}
