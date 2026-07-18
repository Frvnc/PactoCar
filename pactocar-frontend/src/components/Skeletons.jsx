// Placeholders de carga (skeleton) con efecto shimmer.
const SkeletonCard = () => (
  <div className="skeleton-card" aria-hidden="true">
    <div className="skeleton sk-title" />
    <div className="skeleton sk-line w80" />
    <div className="skeleton sk-line w60" />
    <div className="skeleton sk-line w40" />
  </div>
);

const Skeletons = ({ n = 3 }) => (
  <div role="status" aria-label="Cargando">
    {Array.from({ length: n }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default Skeletons;
