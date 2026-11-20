import { useMemo, useState } from 'react';
import { countByTag, runQuery, type Query } from '../lib/query';
import type { Album, SortKey } from '../lib/types';
import { usePref, useStore } from '../store';
import { AddAlbumDialog } from './AddAlbumDialog';
import { Artwork } from './Artwork';
import { StarRating } from './StarRating';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'addedAt', label: '追加日' },
  { key: 'title', label: 'アルバム名' },
  { key: 'artist', label: 'アーティスト' },
  { key: 'releaseDate', label: '発売日' },
  { key: 'rating', label: '評価' },
];

const defaultQuery: Query = { keyword: '', tagIds: [], tagMode: 'and', sortKey: 'addedAt', sortDir: 'desc' };

export function Library() {
  const { data } = useStore();
  const [query, setQuery] = usePref<Query>('query', defaultQuery);
  const [view, setView] = usePref<{ mode: 'grid' | 'list' }>('view', { mode: 'grid' });
  const [adding, setAdding] = useState(false);
  const [showTags, setShowTags] = useState(query.tagIds.length > 0);

  // 削除されたタグが選択状態に残らないようにする
  const tagIds = query.tagIds.filter((id) => data.tags.some((t) => t.id === id));
  const q = { ...query, tagIds };
  const results = useMemo(() => runQuery(data.albums, q), [data.albums, query, data.tags]);
  const counts = useMemo(() => countByTag(data.albums), [data.albums]);
  const tagName = useMemo(() => new Map(data.tags.map((t) => [t.id, t.name])), [data.tags]);

  const groups = useMemo(() => {
    const sorted = [...data.tagGroups].sort((a, b) => a.order - b.order);
    const list = sorted.map((g) => ({ id: g.id, name: g.name, tags: data.tags.filter((t) => t.groupId === g.id) }));
    const loose = data.tags.filter((t) => !t.groupId || !sorted.some((g) => g.id === t.groupId));
    if (loose.length) list.push({ id: '', name: sorted.length ? 'その他' : 'タグ', tags: loose });
    return list.filter((g) => g.tags.length);
  }, [data.tags, data.tagGroups]);

  const toggleTag = (id: string) =>
    setQuery({ ...q, tagIds: tagIds.includes(id) ? tagIds.filter((t) => t !== id) : [...tagIds, id] });

  return (
    <main className="page">
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="アルバム・アーティスト・メモを検索"
          aria-label="検索"
          value={q.keyword}
          onChange={(e) => setQuery({ ...q, keyword: e.target.value })}
        />
        <button className="btn primary" onClick={() => setAdding(true)}>
          ＋ 追加
        </button>
      </div>

      <div className="toolbar secondary">
        <button
          className={`btn ${showTags || tagIds.length ? 'active' : ''}`}
          onClick={() => setShowTags(!showTags)}
          aria-expanded={showTags}
        >
          タグで絞り込み{tagIds.length ? `（${tagIds.length}）` : ''}
        </button>
        <div className="sort">
          <select
            aria-label="並び替え"
            value={q.sortKey}
            onChange={(e) => setQuery({ ...q, sortKey: e.target.value as SortKey })}
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            className="btn icon"
            onClick={() => setQuery({ ...q, sortDir: q.sortDir === 'asc' ? 'desc' : 'asc' })}
            aria-label={q.sortDir === 'asc' ? '昇順（クリックで降順）' : '降順（クリックで昇順）'}
            title={q.sortDir === 'asc' ? '昇順' : '降順'}
          >
            {q.sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
        <div className="segmented" role="group" aria-label="表示切り替え">
          <button className={view.mode === 'grid' ? 'on' : ''} aria-pressed={view.mode === 'grid'} onClick={() => setView({ mode: 'grid' })}>
            グリッド
          </button>
          <button className={view.mode === 'list' ? 'on' : ''} aria-pressed={view.mode === 'list'} onClick={() => setView({ mode: 'list' })}>
            リスト
          </button>
        </div>
      </div>

      {showTags && (
        <section className="filter-panel" aria-label="タグで絞り込み">
          {groups.length === 0 ? (
            <p className="muted small">タグはまだありません。アルバムを追加するときに作成できます。</p>
          ) : (
            <>
              <div className="filter-head">
                <div className="segmented small" role="group" aria-label="絞り込み条件">
                  <button className={q.tagMode === 'and' ? 'on' : ''} aria-pressed={q.tagMode === 'and'} onClick={() => setQuery({ ...q, tagMode: 'and' })}>
                    すべて含む
                  </button>
                  <button className={q.tagMode === 'or' ? 'on' : ''} aria-pressed={q.tagMode === 'or'} onClick={() => setQuery({ ...q, tagMode: 'or' })}>
                    どれか含む
                  </button>
                </div>
                {tagIds.length > 0 && (
                  <button className="link" onClick={() => setQuery({ ...q, tagIds: [] })}>
                    選択をクリア
                  </button>
                )}
              </div>
              {groups.map((g) => (
                <div key={g.id || 'loose'} className="tag-group-row">
                  <span className="tag-group-label">{g.name}</span>
                  <div className="chips">
                    {g.tags.map((t) => (
                      <button
                        key={t.id}
                        className={`chip ${tagIds.includes(t.id) ? 'on' : ''}`}
                        aria-pressed={tagIds.includes(t.id)}
                        onClick={() => toggleTag(t.id)}
                      >
                        {t.name} <span className="count">{counts.get(t.id) ?? 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      <p className="muted small result-count">
        {results.length === data.albums.length ? `${data.albums.length}枚` : `${results.length} / ${data.albums.length}枚`}
      </p>

      {data.albums.length === 0 ? (
        <div className="empty">
          <p>まだアルバムがありません。</p>
          <button className="btn primary" onClick={() => setAdding(true)}>
            最初のアルバムを追加
          </button>
        </div>
      ) : results.length === 0 ? (
        <div className="empty">
          <p>条件に合うアルバムがありません。</p>
        </div>
      ) : view.mode === 'grid' ? (
        <ul className="grid">
          {results.map((a) => (
            <li key={a.id}>
              <a href={`#/album/${encodeURIComponent(a.id)}`} className="card">
                <Artwork url={a.artworkUrl} alt="" />
                <span className="card-title">{a.title}</span>
                <span className="card-artist">{a.artist}</span>
                <StarRating value={a.rating} size="sm" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="list">
          {results.map((a) => (
            <ListRow key={a.id} a={a} tagName={tagName} />
          ))}
        </ul>
      )}

      {adding && <AddAlbumDialog onClose={() => setAdding(false)} />}
    </main>
  );
}

function ListRow({ a, tagName }: { a: Album; tagName: Map<string, string> }) {
  return (
    <li>
      <a href={`#/album/${encodeURIComponent(a.id)}`} className="row-item">
        <Artwork url={a.artworkUrl} alt="" className="thumb" />
        <span className="row-main">
          <span className="row-title">{a.title}</span>
          <span className="row-artist">
            {a.artist}
            {a.releaseDate && <span className="muted"> · {a.releaseDate.slice(0, 4)}</span>}
          </span>
          {a.tagIds.length > 0 && (
            <span className="chips mini">
              {a.tagIds.map((t) => tagName.get(t) && <span key={t} className="chip static">{tagName.get(t)}</span>)}
            </span>
          )}
        </span>
        <StarRating value={a.rating} size="sm" />
      </a>
    </li>
  );
}
