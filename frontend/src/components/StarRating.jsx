import { useState } from 'react';

export default function StarRating({ value = 0, onChange, size = 22, readOnly = false }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => !readOnly && onChange && onChange(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          style={{
            fontSize: size,
            cursor: readOnly ? 'default' : 'pointer',
            color: n <= Math.round(active) ? '#f5a623' : '#ccc',
            lineHeight: 1,
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}