import { AlbumDetail } from './components/AlbumDetail';
import { Library } from './components/Library';
import { Settings } from './components/Settings';
import { TagManager } from './components/TagManager';
import { useHashRoute, useStore } from './store';

export function App() {
  const route = useHashRoute();
  const { saveError } = useStore();
  const [page, arg] = route;

  const nav = [
    { href: '#/', label: 'ライブラリ', on: !page },
    { href: '#/tags', label: 'タグ', on: page === 'tags' },
    { href: '#/settings', label: '設定', on: page === 'settings' },
  ];

  return (
    <>
      <header className="app-header">
        <a href="#/" className="logo">
          <span className="logo-mark" aria-hidden />
          albam
        </a>
        <nav>
          {nav.map((n) => (
            <a key={n.href} href={n.href} className={n.on ? 'on' : ''} aria-current={n.on ? 'page' : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
      </header>
      {saveError && (
        <div className="banner error" role="alert">
          {saveError}
        </div>
      )}
      {page === 'album' && arg ? (
        <AlbumDetail key={arg} id={arg} />
      ) : page === 'tags' ? (
        <TagManager />
      ) : page === 'settings' ? (
        <Settings />
      ) : (
        <Library />
      )}
    </>
  );
}
