type Props = {
  value?: number;
  onChange?: (v: number | undefined) => void;
  size?: 'sm' | 'md';
};

const Star = ({ fill }: { fill: number }) => (
  <span className="star" aria-hidden>
    <span className="star-bg">★</span>
    <span className="star-fg" style={{ width: `${fill * 100}%` }}>
      ★
    </span>
  </span>
);

export function StarRating({ value, onChange, size = 'md' }: Props) {
  const v = value ?? 0;
  const fills = [1, 2, 3, 4, 5].map((i) => Math.max(0, Math.min(1, v - (i - 1))));

  if (!onChange) {
    if (value == null) return null;
    return (
      <span className={`stars stars-${size}`} role="img" aria-label={`評価 ${value}`}>
        {fills.map((f, i) => (
          <Star key={i} fill={f} />
        ))}
      </span>
    );
  }

  return (
    <span className={`stars stars-${size} stars-input`} role="group" aria-label="評価">
      {fills.map((f, i) => (
        <span key={i} className="star-wrap">
          <Star fill={f} />
          {[0.5, 1].map((h) => {
            const target = i + h;
            return (
              <button
                key={h}
                type="button"
                className={`star-hit ${h === 0.5 ? 'left' : 'right'}`}
                aria-label={`${target}`}
                aria-pressed={v === target}
                onClick={() => onChange(v === target ? undefined : target)}
              />
            );
          })}
        </span>
      ))}
      <span className="stars-num">{value != null ? value.toFixed(1) : '未評価'}</span>
    </span>
  );
}
