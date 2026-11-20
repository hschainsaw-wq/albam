export type Track = {
  disc: number;
  no: number;
  title: string;
  durationMs?: number;
};

export type Album = {
  /** Apple Music の collectionId。手入力の場合は "manual-..." */
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  releaseDate?: string;
  genre?: string;
  trackCount?: number;
  tracks?: Track[];
  appleMusicUrl?: string;
  country: string;
  tagIds: string[];
  /** 0.5〜5.0（0.5刻み）。未評価は undefined */
  rating?: number;
  memo?: string;
  addedAt: string;
  updatedAt: string;
};

export type Tag = { id: string; name: string; groupId?: string };
export type TagGroup = { id: string; name: string; order: number };

export type Data = {
  version: 1;
  albums: Album[];
  tags: Tag[];
  tagGroups: TagGroup[];
};

export const emptyData = (): Data => ({ version: 1, albums: [], tags: [], tagGroups: [] });

export type SortKey = 'addedAt' | 'title' | 'artist' | 'releaseDate' | 'rating';
export type SortDir = 'asc' | 'desc';
export type TagMode = 'and' | 'or';
