// Estrellas de reputacion dibujadas con SVG (sin emojis).
const Star = ({ filled, size }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
    fill={filled ? 'var(--accent)' : 'none'}
    stroke="var(--accent)"
    strokeWidth="1.5"
    style={{ flexShrink: 0 }}
  >
    <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" />
  </svg>
);

const Stars = ({ value = 0, count = 0, size = 14 }) => {
  const llenas = Math.round(Number(value) || 0);
  const etiqueta = count > 0 ? `${value} de 5 estrellas, ${count} calificaciones` : 'Sin calificaciones aun';
  return (
    <span className="stars-inline" role="img" aria-label={etiqueta}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= llenas} size={size} />
      ))}
      <span className="stars-count">{count > 0 ? `${value} (${count})` : 'Nuevo'}</span>
    </span>
  );
};

export default Stars;
