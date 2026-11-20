import { useRef, useState } from 'react';
import { parseBackup } from '../lib/reducer';
import type { Data } from '../lib/types';
import { useStore } from '../store';

export function Settings() {
  const { data, dispatch } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Data | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    a.href = URL.createObjectURL(blob);
    a.download = `albam-backup-${stamp}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      setPending(parseBackup(await f.text()));
      setMsg(null);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const apply = (mode: 'replace' | 'merge') => {
    if (!pending) return;
    if (mode === 'replace' && !confirm('今のデータをすべて消して、ファイルの内容に置き換えます。よろしいですか？')) return;
    dispatch({ type: 'import', data: pending, mode });
    setMsg({ ok: true, text: `${pending.albums.length}枚のアルバムを読み込みました（${mode === 'replace' ? '置き換え' : '追加'}）` });
    setPending(null);
  };

  return (
    <main className="page">
      <h1>設定・バックアップ</h1>

      <section className="panel notice">
        <h2>データの保存について</h2>
        <p>
          データは<strong>このブラウザの中だけ</strong>に保存されています。別の端末や別のブラウザには同期されません。
          ブラウザの履歴・サイトデータを削除すると<strong>データも消えます</strong>。定期的に書き出してバックアップしてください。
        </p>
        <p className="muted small">
          別の端末へ移すときは、この画面で書き出したファイルを、移す先の端末で読み込んでください。
        </p>
      </section>

      <section className="panel">
        <h2>書き出し</h2>
        <p className="muted small">
          アルバム {data.albums.length}枚 / タグ {data.tags.length}個 / グループ {data.tagGroups.length}個
        </p>
        <button className="btn primary" onClick={exportJson}>
          JSONファイルに書き出す
        </button>
      </section>

      <section className="panel">
        <h2>読み込み</h2>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={(e) => onFile(e.target.files?.[0])} aria-label="バックアップファイル" />
        {pending && (
          <div className="import-box">
            <p>
              ファイルの内容: アルバム {pending.albums.length}枚 / タグ {pending.tags.length}個 / グループ {pending.tagGroups.length}個
            </p>
            <div className="row wrap">
              <button className="btn primary" onClick={() => apply('merge')}>
                今のデータに追加
              </button>
              <button className="btn danger" onClick={() => apply('replace')}>
                すべて置き換え
              </button>
              <button className="btn" onClick={() => setPending(null)}>
                やめる
              </button>
            </div>
            <p className="muted small">
              「追加」では同じ名前のタグはひとつにまとめ、登録済みのアルバムにはタグを足します。評価とメモは、今のデータが空のときだけ取り込みます。
            </p>
          </div>
        )}
        {msg && (
          <p className={msg.ok ? 'ok' : 'error'} role="status">
            {msg.text}
          </p>
        )}
      </section>
    </main>
  );
}
