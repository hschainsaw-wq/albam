import { useMemo, useState } from 'react';
import { findTagByName, newId } from '../lib/reducer';
import { useStore } from '../store';

type Props = { value: string[]; onChange: (ids: string[]) => void };

/** アルバムに付けるタグを選ぶ。存在しない名前を入力すると新規作成できる */
export function TagPicker({ value, onChange }: Props) {
  const { data, dispatch } = useStore();
  const [text, setText] = useState('');

  const groups = useMemo(() => {
    const sorted = [...data.tagGroups].sort((a, b) => a.order - b.order);
    const list = sorted.map((g) => ({ id: g.id, name: g.name, tags: data.tags.filter((t) => t.groupId === g.id) }));
    const loose = data.tags.filter((t) => !t.groupId || !sorted.some((g) => g.id === t.groupId));
    if (loose.length) list.push({ id: '', name: sorted.length ? 'その他' : 'タグ', tags: loose });
    return list.filter((g) => g.tags.length);
  }, [data.tags, data.tagGroups]);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);

  const q = text.trim();
  const exact = q ? findTagByName(data.tags, q) : undefined;

  const submit = () => {
    if (!q) return;
    if (exact) {
      if (!value.includes(exact.id)) onChange([...value, exact.id]);
    } else {
      const id = newId();
      dispatch({ type: 'addTag', tag: { id, name: q } });
      onChange([...value, id]);
    }
    setText('');
  };

  const norm = (s: string) => s.normalize('NFKC').toLowerCase();

  return (
    <div className="tag-picker">
      <div className="tag-picker-input">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="タグを検索 / 新しいタグを入力"
          aria-label="タグ名"
        />
        <button type="button" className="btn" onClick={submit} disabled={!q}>
          {q && !exact ? '作成して追加' : '追加'}
        </button>
      </div>
      {groups.length === 0 && <p className="muted small">まだタグがありません。上の欄に入力して作成できます。</p>}
      {groups.map((g) => {
        const tags = q ? g.tags.filter((t) => norm(t.name).includes(norm(q))) : g.tags;
        if (!tags.length) return null;
        return (
          <div key={g.id || 'loose'} className="tag-group-row">
            <span className="tag-group-label">{g.name}</span>
            <div className="chips">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`chip ${value.includes(t.id) ? 'on' : ''}`}
                  aria-pressed={value.includes(t.id)}
                  onClick={() => toggle(t.id)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
