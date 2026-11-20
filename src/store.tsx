import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { reducer, type Action } from './lib/reducer';
import { loadData, requestPersistence, saveData } from './lib/storage';
import { emptyData, type Data } from './lib/types';

type Store = { data: Data; dispatch: (a: Action) => void; saveError: string | null };

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, emptyData);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    loadData()
      .then((d) => dispatch({ type: 'load', data: d }))
      .catch((e) => setLoadError(String(e)))
      .finally(() => setLoaded(true));
    void requestPersistence();
  }, []);

  useEffect(() => {
    if (!loaded || loadError) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      saveData(data)
        .then(() => setSaveError(null))
        .catch((e) => setSaveError(`保存に失敗しました: ${String(e)}`));
    }, 200);
    return () => clearTimeout(t);
  }, [data, loaded, loadError]);

  if (!loaded) return <div className="center-msg">読み込み中…</div>;
  if (loadError)
    return (
      <div className="center-msg">
        データを読み込めませんでした。プライベートブラウズでは保存できないことがあります。
        <br />
        <small>{loadError}</small>
      </div>
    );
  return <Ctx.Provider value={{ data, dispatch, saveError }}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

/** localStorage に覚えておく画面設定（失敗しても動く） */
export function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`albam:${key}`);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      return initial;
    }
  });
  const set = (nv: T) => {
    setV(nv);
    try {
      localStorage.setItem(`albam:${key}`, JSON.stringify(nv));
    } catch {
      /* ignore */
    }
  };
  return [v, set];
}

export function useHashRoute(): string[] {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

export const go = (path: string) => {
  location.hash = path;
};
