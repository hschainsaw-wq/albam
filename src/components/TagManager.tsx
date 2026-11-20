import { useMemo, useState } from 'react';
import { compareTagNames, countByTag } from '../lib/query';
import { findTagByName, newId } from '../lib/reducer';
import type { Tag } from '../lib/types';
import { useStore } from '../store';

export function TagManager() {
  const { data, dispatch } = useStore();
  const [newGroup, setNewGroup] = useState('');
  const [newTag, setNewTag] = useState('');
  const counts = useMemo(() => countByTag(data.albums), [data.albums]);
  const groups = [...data.tagGroups].sort((a, b) => a.order - b.order);
  const loose = data.tags.filter((t) => !t.groupId || !groups.some((g) => g.id === t.groupId));

  return (
    <main className="page">
      <h1>タグの管理</h1>

      <section className="panel">
        <h2>新しく作る</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (newTag.trim()) dispatch({ type: 'addTag', tag: { id: newId(), name: newTag.trim() } });
            setNewTag('');
          }}
        >
          <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="タグ名" aria-label="新しいタグ名" />
          <button className="btn" disabled={!newTag.trim() || !!findTagByName(data.tags, newTag)}>
            タグを作成
          </button>
        </form>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (newGroup.trim())
              dispatch({ type: 'addGroup', group: { id: newId(), name: newGroup.trim(), order: data.tagGroups.length } });
            setNewGroup('');
          }}
        >
          <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="グループ名（例: ジャンル、気分、シーン）" aria-label="新しいグループ名" />
          <button className="btn" disabled={!newGroup.trim()}>
            グループを作成
          </button>
        </form>
      </section>

      {groups.map((g, i) => (
        <section key={g.id} className="panel">
          <div className="group-head">
            <EditableName
              value={g.name}
              label="グループ名"
              onSave={(name) => dispatch({ type: 'renameGroup', id: g.id, name })}
            />
            <div className="row">
              <button className="btn icon" disabled={i === 0} onClick={() => dispatch({ type: 'moveGroup', id: g.id, delta: -1 })} aria-label="上へ">
                ↑
              </button>
              <button className="btn icon" disabled={i === groups.length - 1} onClick={() => dispatch({ type: 'moveGroup', id: g.id, delta: 1 })} aria-label="下へ">
                ↓
              </button>
              <button
                className="btn danger"
                onClick={() => confirm(`グループ「${g.name}」を削除しますか？（タグは「グループなし」に移ります）`) && dispatch({ type: 'deleteGroup', id: g.id })}
              >
                削除
              </button>
            </div>
          </div>
          <TagTable tags={data.tags.filter((t) => t.groupId === g.id)} counts={counts} />
        </section>
      ))}

      <section className="panel">
        <h2>グループなし</h2>
        {loose.length ? <TagTable tags={loose} counts={counts} /> : <p className="muted small">なし</p>}
      </section>
    </main>
  );
}

function TagTable({ tags, counts }: { tags: Tag[]; counts: Map<string, number> }) {
  const { data, dispatch } = useStore();
  const [merging, setMerging] = useState<string | null>(null);
  if (!tags.length) return <p className="muted small">このグループにタグはありません</p>;
  const sorted = [...tags].sort(compareTagNames);
  return (
    <ul className="tag-table">
      {sorted.map((t) => (
        <li key={t.id}>
          <div className="tag-line">
            <EditableName
              value={t.name}
              label="タグ名"
              validate={(name) => {
                const c = findTagByName(data.tags, name);
                return c && c.id !== t.id ? '同じ名前のタグがあります（統合を使ってください）' : null;
              }}
              onSave={(name) => dispatch({ type: 'renameTag', id: t.id, name })}
            />
            <span className="count-badge">{counts.get(t.id) ?? 0}枚</span>
          </div>
          <div className="row wrap tag-actions">
            <select
              aria-label={`${t.name} のグループ`}
              value={t.groupId ?? ''}
              onChange={(e) => dispatch({ type: 'setTagGroup', id: t.id, groupId: e.target.value || undefined })}
            >
              <option value="">グループなし</option>
              {[...data.tagGroups]
                .sort((a, b) => a.order - b.order)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select>
            {merging === t.id ? (
              <select
                autoFocus
                aria-label={`${t.name} の統合先`}
                defaultValue=""
                onBlur={() => setMerging(null)}
                onChange={(e) => {
                  const into = data.tags.find((x) => x.id === e.target.value);
                  if (into && confirm(`「${t.name}」を「${into.name}」に統合しますか？「${t.name}」は削除されます。`)) {
                    dispatch({ type: 'mergeTag', from: t.id, into: into.id });
                  }
                  setMerging(null);
                }}
              >
                <option value="" disabled>
                  統合先を選択…
                </option>
                {data.tags
                  .filter((x) => x.id !== t.id)
                  .sort(compareTagNames)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
              </select>
            ) : (
              <button className="btn" disabled={data.tags.length < 2} onClick={() => setMerging(t.id)}>
                統合
              </button>
            )}
            <button
              className="btn danger"
              onClick={() => {
                const n = counts.get(t.id) ?? 0;
                if (confirm(`タグ「${t.name}」を削除しますか？${n ? `（${n}枚のアルバムから外れます）` : ''}`))
                  dispatch({ type: 'deleteTag', id: t.id });
              }}
            >
              削除
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EditableName({
  value,
  label,
  onSave,
  validate,
}: {
  value: string;
  label: string;
  onSave: (v: string) => void;
  validate?: (v: string) => string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const err = editing && v.trim() ? validate?.(v.trim()) ?? null : null;
  if (!editing)
    return (
      <button className="name-btn" onClick={() => (setV(value), setEditing(true))} title="クリックで名前を変更">
        {value} <span className="muted small">✎</span>
      </button>
    );
  return (
    <form
      className="row inline-edit"
      onSubmit={(e) => {
        e.preventDefault();
        if (err || !v.trim()) return;
        onSave(v.trim());
        setEditing(false);
      }}
    >
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)} aria-label={label} onKeyDown={(e) => e.key === 'Escape' && setEditing(false)} />
      <button className="btn primary" disabled={!!err || !v.trim()}>
        保存
      </button>
      <button type="button" className="btn" onClick={() => setEditing(false)}>
        取消
      </button>
      {err && <span className="error small">{err}</span>}
    </form>
  );
}
