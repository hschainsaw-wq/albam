import { useState } from 'react';
import { parseAppleMusicUrl } from '../lib/appleMusicUrl';
import { fetchAlbum, type AlbumInfo } from '../lib/itunes';
import { newId } from '../lib/reducer';
import type { Album } from '../lib/types';
import { go, useStore } from '../store';
import { Artwork } from './Artwork';
import { Modal } from './Modal';
import { StarRating } from './StarRating';
import { TagPicker } from './TagPicker';

type Step =
  | { s: 'url'; error?: string; existingId?: string }
  | { s: 'loading' }
  | { s: 'preview'; info: AlbumInfo }
  | { s: 'manual' };

export function AddAlbumDialog({ onClose }: { onClose: () => void }) {
  const { data, dispatch } = useStore();
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>({ s: 'url' });
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [rating, setRating] = useState<number | undefined>();
  const [memo, setMemo] = useState('');
  const [manual, setManual] = useState({ title: '', artist: '', artworkUrl: '', appleMusicUrl: '' });

  const lookup = async () => {
    const parsed = parseAppleMusicUrl(url);
    if (!parsed) {
      setStep({ s: 'url', error: 'Apple Music のアルバムまたは曲のURLを貼り付けてください' });
      return;
    }
    if (parsed.kind === 'album' && data.albums.some((a) => a.id === parsed.id)) {
      setStep({ s: 'url', error: 'このアルバムは登録済みです', existingId: parsed.id });
      return;
    }
    setStep({ s: 'loading' });
    try {
      const info = await fetchAlbum(parsed);
      if (data.albums.some((a) => a.id === info.id)) {
        setStep({ s: 'url', error: 'このアルバムは登録済みです', existingId: info.id });
        return;
      }
      setStep({ s: 'preview', info });
    } catch (e) {
      setStep({ s: 'url', error: e instanceof Error ? e.message : String(e) });
    }
  };

  const save = (base: Omit<Album, 'tagIds' | 'rating' | 'memo' | 'addedAt' | 'updatedAt'>) => {
    const t = new Date().toISOString();
    dispatch({
      type: 'addAlbum',
      album: { ...base, tagIds, rating, memo: memo.trim() || undefined, addedAt: t, updatedAt: t },
    });
    onClose();
  };

  const extras = (
    <>
      <label className="field-label">タグ</label>
      <TagPicker value={tagIds} onChange={setTagIds} />
      <label className="field-label">評価</label>
      <StarRating value={rating} onChange={setRating} />
      <label className="field-label" htmlFor="add-memo">
        メモ
      </label>
      <textarea id="add-memo" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
    </>
  );

  return (
    <Modal title="アルバムを追加" onClose={onClose}>
      {(step.s === 'url' || step.s === 'loading') && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void lookup();
          }}
        >
          <label className="field-label" htmlFor="add-url">
            Apple Music のURL
          </label>
          <p className="muted small">Music アプリで「共有」→「リンクをコピー」したURLを貼り付けてください。</p>
          <div className="row">
            <input
              id="add-url"
              type="url"
              inputMode="url"
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://music.apple.com/jp/album/..."
            />
            <button className="btn primary" disabled={!url.trim() || step.s === 'loading'}>
              {step.s === 'loading' ? '取得中…' : '取得'}
            </button>
          </div>
          {step.s === 'url' && step.error && (
            <p className="error" role="alert">
              {step.error}
              {step.existingId && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      onClose();
                      go(`/album/${step.existingId}`);
                    }}
                  >
                    開く
                  </button>
                </>
              )}
            </p>
          )}
          <p className="small">
            <button type="button" className="link" onClick={() => setStep({ s: 'manual' })}>
              情報が取得できないときは手入力で登録
            </button>
          </p>
        </form>
      )}

      {step.s === 'preview' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(step.info);
          }}
        >
          <div className="preview">
            <Artwork url={step.info.artworkUrl} alt={step.info.title} />
            <div>
              <strong>{step.info.title}</strong>
              <div>{step.info.artist}</div>
              <div className="muted small">
                {[step.info.releaseDate?.slice(0, 4), step.info.genre, step.info.trackCount && `${step.info.trackCount}曲`]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          </div>
          {extras}
          <div className="actions">
            <button type="button" className="btn" onClick={() => setStep({ s: 'url' })}>
              戻る
            </button>
            <button className="btn primary">登録</button>
          </div>
        </form>
      )}

      {step.s === 'manual' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save({
              id: `manual-${newId()}`,
              title: manual.title.trim(),
              artist: manual.artist.trim(),
              artworkUrl: manual.artworkUrl.trim() || undefined,
              appleMusicUrl: manual.appleMusicUrl.trim() || url.trim() || undefined,
              country: parseAppleMusicUrl(url)?.country ?? 'jp',
            });
          }}
        >
          {(
            [
              ['title', 'アルバム名', true],
              ['artist', 'アーティスト', true],
              ['artworkUrl', 'ジャケット画像のURL（任意）', false],
              ['appleMusicUrl', 'Apple Music のURL（任意）', false],
            ] as const
          ).map(([k, label, req]) => (
            <div key={k}>
              <label className="field-label" htmlFor={`m-${k}`}>
                {label}
              </label>
              <input
                id={`m-${k}`}
                required={req}
                value={manual[k]}
                onChange={(e) => setManual({ ...manual, [k]: e.target.value })}
              />
            </div>
          ))}
          {extras}
          <div className="actions">
            <button type="button" className="btn" onClick={() => setStep({ s: 'url' })}>
              戻る
            </button>
            <button className="btn primary">登録</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
