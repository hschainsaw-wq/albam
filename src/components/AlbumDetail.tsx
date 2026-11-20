import { useState } from 'react';
import type { AlbumPatch } from '../lib/reducer';
import { go, useStore } from '../store';
import { Artwork } from './Artwork';
import { StarRating } from './StarRating';
import { TagPicker } from './TagPicker';

const fmtTime = (ms?: number) => {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function AlbumDetail({ id }: { id: string }) {
  const { data, dispatch } = useStore();
  const album = data.albums.find((a) => a.id === id);
  const [memo, setMemo] = useState(album?.memo ?? '');
  const [editingInfo, setEditingInfo] = useState(false);

  if (!album) {
    return (
      <main className="page">
        <p>アルバムが見つかりません。</p>
        <a href="#/">一覧に戻る</a>
      </main>
    );
  }

  const update = (patch: AlbumPatch) =>
    dispatch({ type: 'updateAlbum', id: album.id, patch });

  const discs = new Set(album.tracks?.map((t) => t.disc)).size > 1;

  return (
    <main className="page detail">
      <a href="#/" className="back">
        ← 一覧
      </a>
      <div className="detail-head">
        <Artwork url={album.artworkUrl} alt={album.title} className="detail-art" />
        <div className="detail-info">
          {editingInfo ? (
            <InfoEditor
              initial={{ title: album.title, artist: album.artist, artworkUrl: album.artworkUrl ?? '', appleMusicUrl: album.appleMusicUrl ?? '' }}
              onCancel={() => setEditingInfo(false)}
              onSave={(v) => {
                update({
                  title: v.title.trim() || album.title,
                  artist: v.artist.trim() || album.artist,
                  artworkUrl: v.artworkUrl.trim() || undefined,
                  appleMusicUrl: v.appleMusicUrl.trim() || undefined,
                });
                setEditingInfo(false);
              }}
            />
          ) : (
            <>
              <h1>{album.title}</h1>
              <p className="detail-artist">{album.artist}</p>
              <p className="muted small">
                {[album.releaseDate?.slice(0, 10), album.genre, album.trackCount && `${album.trackCount}曲`].filter(Boolean).join(' · ')}
              </p>
              <div className="row wrap">
                {album.appleMusicUrl && (
                  <a className="btn primary" href={album.appleMusicUrl} target="_blank" rel="noopener noreferrer">
                    Apple Music で開く
                  </a>
                )}
                <button className="btn" onClick={() => setEditingInfo(true)}>
                  情報を編集
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <section className="panel">
        <h2>評価</h2>
        <StarRating value={album.rating} onChange={(rating) => update({ rating })} />
      </section>

      <section className="panel">
        <h2>タグ</h2>
        <TagPicker value={album.tagIds} onChange={(tagIds) => update({ tagIds })} />
      </section>

      <section className="panel">
        <h2>
          <label htmlFor="detail-memo">メモ</label>
        </h2>
        <textarea
          id="detail-memo"
          rows={4}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={() => memo !== (album.memo ?? '') && update({ memo: memo.trim() ? memo : undefined })}
          placeholder="感想など（入力欄から離れると保存されます）"
        />
      </section>

      {album.tracks && album.tracks.length > 0 && (
        <section className="panel">
          <h2>収録曲</h2>
          <ol className="tracks">
            {album.tracks.map((t) => (
              <li key={`${t.disc}-${t.no}-${t.title}`}>
                <span className="muted num">{discs ? `${t.disc}-${t.no}` : t.no}</span>
                <span className="t-title">{t.title}</span>
                <span className="muted">{fmtTime(t.durationMs)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="muted small">
        追加日 {new Date(album.addedAt).toLocaleDateString('ja-JP')}
      </p>
      <button
        className="btn danger"
        onClick={() => {
          if (confirm(`「${album.title}」を削除しますか？`)) {
            dispatch({ type: 'deleteAlbum', id: album.id });
            go('/');
          }
        }}
      >
        このアルバムを削除
      </button>
    </main>
  );
}

type Info = { title: string; artist: string; artworkUrl: string; appleMusicUrl: string };

function InfoEditor({ initial, onSave, onCancel }: { initial: Info; onSave: (v: Info) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const fields: [keyof Info, string][] = [
    ['title', 'アルバム名'],
    ['artist', 'アーティスト'],
    ['artworkUrl', 'ジャケット画像のURL'],
    ['appleMusicUrl', 'Apple Music のURL'],
  ];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(v);
      }}
    >
      {fields.map(([k, label]) => (
        <div key={k}>
          <label className="field-label" htmlFor={`e-${k}`}>
            {label}
          </label>
          <input id={`e-${k}`} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
        </div>
      ))}
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>
          キャンセル
        </button>
        <button className="btn primary">保存</button>
      </div>
    </form>
  );
}
