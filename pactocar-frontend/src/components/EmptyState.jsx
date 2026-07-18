import Icon from './Icon';

// Estado vacio reutilizable con icono.
const EmptyState = ({ icon = 'inbox', title, children }) => (
  <div className="empty">
    <span className="empty-icon"><Icon name={icon} size={26} /></span>
    <strong>{title}</strong>
    {children}
  </div>
);

export default EmptyState;
