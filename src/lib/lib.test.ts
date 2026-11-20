import { describe, expect, it } from 'vitest';
import { parseAppleMusicUrl } from './appleMusicUrl';
import { largeArtwork, toAlbumInfo } from './itunes';
import { runQuery } from './query';
import { mergeData, parseBackup, reducer } from './reducer';
import type { Album, Data } from './types';

const album = (id: string, p: Partial<Album> = {}): Album => ({
  id,
  title: `Album ${id}`,
  artist: 'Artist',
  country: 'jp',
  tagIds: [],
  addedAt: `2026-01-0${id}T00:00:00Z`,
  updatedAt: '2026-01-01T00:00:00Z',
  ...p,
});

describe('parseAppleMusicUrl', () => {
  it.each([
    ['https://music.apple.com/jp/album/kind-of-blue/268443092', { kind: 'album', id: '268443092', country: 'jp' }],
    ['https://music.apple.com/us/album/kind-of-blue/268443092?i=268443097', { kind: 'album', id: '268443092', country: 'us' }],
    ['https://music.apple.com/jp/album/268443092', { kind: 'album', id: '268443092', country: 'jp' }],
    ['https://music.apple.com/album/x/268443092', { kind: 'album', id: '268443092', country: 'jp' }],
    ['https://music.apple.com/jp/song/so-what/268443097', { kind: 'song', id: '268443097', country: 'jp' }],
    ['https://itunes.apple.com/jp/album/x/id268443092?uo=4', { kind: 'album', id: '268443092', country: 'jp' }],
    ['  https://geo.music.apple.com/jp/album/x/268443092  ', { kind: 'album', id: '268443092', country: 'jp' }],
  ])('%s', (url, expected) => {
    expect(parseAppleMusicUrl(url)).toEqual(expected);
  });

  it.each([
    'https://music.apple.com/jp/playlist/x/pl.123',
    'https://example.com/jp/album/x/123',
    'https://music.apple.com.evil.com/jp/album/x/123',
    'not a url',
  ])('rejects %s', (url) => {
    expect(parseAppleMusicUrl(url)).toBeNull();
  });
});

describe('toAlbumInfo', () => {
  it('maps lookup response and sorts tracks by disc/no', () => {
    const info = toAlbumInfo(
      {
        resultCount: 3,
        results: [
          {
            wrapperType: 'collection', collectionId: 1, collectionName: 'A', artistName: 'B',
            artworkUrl100: 'https://is1.mzstatic.com/x/100x100bb.jpg', trackCount: 2,
            collectionViewUrl: 'https://music.apple.com/jp/album/a/1?uo=4',
          },
          { wrapperType: 'track', trackName: 'T2', trackNumber: 1, discNumber: 2 },
          { wrapperType: 'track', trackName: 'T1', trackNumber: 1, discNumber: 1 },
        ],
      },
      'jp',
    );
    expect(info?.artworkUrl).toBe('https://is1.mzstatic.com/x/600x600bb.jpg');
    expect(info?.appleMusicUrl).toBe('https://music.apple.com/jp/album/a/1');
    expect(info?.tracks.map((t) => t.title)).toEqual(['T1', 'T2']);
  });
  it('returns null without a collection', () => {
    expect(toAlbumInfo({ resultCount: 0, results: [] }, 'jp')).toBeNull();
  });
  it('largeArtwork leaves undefined alone', () => {
    expect(largeArtwork(undefined)).toBeUndefined();
  });
});

describe('runQuery', () => {
  const albums = [
    album('1', { title: 'Kind of Blue', tagIds: ['jazz', 'night'], rating: 5 }),
    album('2', { title: 'Waltz for Debby', tagIds: ['jazz'], memo: '夜に聴く' }),
    album('3', { title: 'ＡＢＣ', tagIds: ['night'], rating: 3.5 }),
  ];
  const base = { keyword: '', tagIds: [], tagMode: 'and' as const, sortKey: 'addedAt' as const, sortDir: 'desc' as const };

  it('keyword searches title and memo with NFKC normalization', () => {
    expect(runQuery(albums, { ...base, keyword: 'abc' }).map((a) => a.id)).toEqual(['3']);
    expect(runQuery(albums, { ...base, keyword: '夜' }).map((a) => a.id)).toEqual(['2']);
  });
  it('tag AND / OR', () => {
    const q = { ...base, tagIds: ['jazz', 'night'] };
    expect(runQuery(albums, q).map((a) => a.id)).toEqual(['1']);
    expect(runQuery(albums, { ...q, tagMode: 'or' }).map((a) => a.id)).toEqual(['3', '2', '1']);
  });
  it('rating sort puts unrated last in both directions', () => {
    expect(runQuery(albums, { ...base, sortKey: 'rating', sortDir: 'desc' }).map((a) => a.id)).toEqual(['1', '3', '2']);
    expect(runQuery(albums, { ...base, sortKey: 'rating', sortDir: 'asc' }).map((a) => a.id)).toEqual(['3', '1', '2']);
  });
});

describe('reducer', () => {
  const data: Data = {
    version: 1,
    albums: [album('1', { tagIds: ['a', 'b'] }), album('2', { tagIds: ['a'] })],
    tags: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B', groupId: 'g' }],
    tagGroups: [{ id: 'g', name: 'G', order: 0 }],
  };

  it('merges tag A into B without duplicates', () => {
    const s = reducer(data, { type: 'mergeTag', from: 'a', into: 'b' });
    expect(s.tags.map((t) => t.id)).toEqual(['b']);
    expect(s.albums.map((a) => a.tagIds)).toEqual([['b'], ['b']]);
  });
  it('deletes tag from albums', () => {
    const s = reducer(data, { type: 'deleteTag', id: 'a' });
    expect(s.albums.map((a) => a.tagIds)).toEqual([['b'], []]);
  });
  it('rejects duplicate tag names (case/width-insensitive)', () => {
    expect(reducer(data, { type: 'addTag', tag: { id: 'x', name: 'ａ' } })).toBe(data);
    expect(reducer(data, { type: 'renameTag', id: 'a', name: 'b' })).toBe(data);
  });
  it('deleting a group ungroups its tags', () => {
    const s = reducer(data, { type: 'deleteGroup', id: 'g' });
    expect(s.tags.find((t) => t.id === 'b')?.groupId).toBeUndefined();
  });
  it('ignores duplicate album', () => {
    expect(reducer(data, { type: 'addAlbum', album: album('1') })).toBe(data);
  });
});

describe('mergeData / parseBackup', () => {
  it('matches tags by name and unions album tags', () => {
    const base: Data = {
      version: 1,
      albums: [album('1', { tagIds: ['a'], memo: '' })],
      tags: [{ id: 'a', name: 'Jazz' }],
      tagGroups: [],
    };
    const incoming: Data = {
      version: 1,
      albums: [album('1', { tagIds: ['x', 'y'], memo: 'm', rating: 4 }), album('2', { tagIds: ['y'] })],
      tags: [{ id: 'x', name: 'jazz' }, { id: 'y', name: 'Night', groupId: 'g' }],
      tagGroups: [{ id: 'g', name: '気分', order: 0 }],
    };
    const m = mergeData(base, incoming);
    expect(m.tags.map((t) => t.name)).toEqual(['Jazz', 'Night']);
    expect(m.tags[1].groupId).toBe('g');
    expect(m.albums[0]).toMatchObject({ tagIds: ['a', 'y'], memo: 'm', rating: 4 });
    expect(m.albums[1].tagIds).toEqual(['y']);
  });
  it('rejects non-backup JSON', () => {
    expect(() => parseBackup('{}')).toThrow();
    expect(() => parseBackup('nope')).toThrow();
    expect(parseBackup(JSON.stringify({ version: 1, albums: [], tags: [] })).tagGroups).toEqual([]);
  });
});
