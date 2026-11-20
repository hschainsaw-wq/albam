import { describe, expect, it } from 'vitest';
import { applyAutoTags, applyAutoTagsToAll, decadeLabel, genreLabel, suggestAutoTags } from './autoTags';
import { groupTags } from './query';
import { reducer } from './reducer';
import type { Album, Data } from './types';

const album = (id: string, p: Partial<Album> = {}): Album => ({
  id, title: id, artist: 'A', country: 'jp', tagIds: [],
  addedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...p,
});

describe('decadeLabel', () => {
  it.each([
    ['1994-03-01T08:00:00Z', '1990年代'],
    ['2000-01-01T00:00:00Z', '2000年代'],
    ['1959-08-17T07:00:00Z', '1950年代'],
    ['2026-11-20', '2020年代'],
    [undefined, undefined],
    ['', undefined],
    ['abcd', undefined],
  ])('%s → %s', (d, want) => expect(decadeLabel(d)).toBe(want));
});

describe('genreLabel', () => {
  it.each([
    ['Rock', 'ロック'], ['Hard Rock', 'ロック'], ['Metal', 'ロック'], ['Punk', 'ロック'], ['ロック', 'ロック'],
    ['Pop', 'ポップ'], ['ポップ', 'ポップ'], ['J-Pop', 'J-POP'], ['K-Pop', 'K-POP'],
    ['Alternative', 'オルタナティブ'], ['Indie Rock', 'オルタナティブ'],
    ['Hip-Hop/Rap', 'ヒップホップ'], ['ヒップホップ/ラップ', 'ヒップホップ'],
    ['R&B/Soul', 'R&B/ソウル'], ['Jazz', 'ジャズ'], ['Vocal Jazz', 'ジャズ'],
    ['Electronic', 'エレクトロニック'], ['Dance', 'エレクトロニック'],
    ['Soundtrack', 'サウンドトラック'], ['Anime', 'アニメ'], ['Classical', 'クラシック'],
    ['Singer/Songwriter', 'シンガーソングライター'],
    ['Christian & Gospel', 'Christian & Gospel'],
  ])('%s → %s', (g, want) => expect(genreLabel(g)).toBe(want));
  it('empty → undefined', () => expect(genreLabel('  ')).toBeUndefined());
});

describe('applyAutoTags', () => {
  const base = (): Data => ({ version: 1, albums: [album('1')], tags: [], tagGroups: [] });

  it('creates groups and tags on first use, reuses them afterwards', () => {
    let d = applyAutoTags(base(), '1', suggestAutoTags({ releaseDate: '1994-01-01', genre: 'Rock' }));
    expect(d.tagGroups.map((g) => g.name)).toEqual(['年代', 'ジャンル']);
    expect(d.tags.map((t) => t.name)).toEqual(['1990年代', 'ロック']);
    expect(d.albums[0].tagIds).toEqual(d.tags.map((t) => t.id));

    d = reducer(d, { type: 'addAlbum', album: album('2'), autoTags: suggestAutoTags({ releaseDate: '1998-01-01', genre: 'Hard Rock' }) });
    expect(d.tags).toHaveLength(2);
    expect(d.albums[1].tagIds).toEqual(d.albums[0].tagIds);
  });

  it('uses an existing same-named tag even outside the group', () => {
    const d0: Data = { ...base(), tags: [{ id: 'mine', name: 'ロック' }] };
    const d = applyAutoTags(d0, '1', [{ group: 'ジャンル', name: 'ロック' }]);
    expect(d.tags).toHaveLength(1);
    expect(d.tagGroups).toHaveLength(0);
    expect(d.albums[0].tagIds).toEqual(['mine']);
  });

  it('returns the same object when nothing changes', () => {
    const d = applyAutoTags(base(), '1', [{ group: '年代', name: '1990年代' }]);
    expect(applyAutoTags(d, '1', [{ group: '年代', name: '1990年代' }])).toBe(d);
  });

  it('applyAutoTagsToAll counts newly added tags', () => {
    const d0: Data = {
      version: 1,
      albums: [album('1', { releaseDate: '1994-01-01', genre: 'Rock' }), album('2', { genre: 'Jazz' }), album('3')],
      tags: [], tagGroups: [],
    };
    const { data, added } = applyAutoTagsToAll(d0);
    expect(added).toBe(3);
    expect(applyAutoTagsToAll(data).added).toBe(0);
  });
});

describe('groupTags', () => {
  it('sorts decade tags numerically', () => {
    const tags = ['2000年代', '1990年代', '1960年代'].map((name) => ({ id: name, name, groupId: 'g' }));
    expect(groupTags(tags, [{ id: 'g', name: '年代', order: 0 }])[0].tags.map((t) => t.name)).toEqual(['1960年代', '1990年代', '2000年代']);
  });
});
