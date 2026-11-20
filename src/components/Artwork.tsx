import { useState } from 'react';

export function Artwork({ url, alt, className = '' }: { url?: string; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className={`artwork placeholder ${className}`} role="img" aria-label={alt}>
        ♪
      </div>
    );
  }
  return <img className={`artwork ${className}`} src={url} alt={alt} loading="lazy" onError={() => setBroken(true)} />;
}
