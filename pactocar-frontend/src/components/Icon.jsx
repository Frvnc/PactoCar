// Iconos SVG monocromos (estilo linea), sin dependencias ni emojis.
const Icon = ({ name, size = 22 }) => {
  const base = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  switch (name) {
    case 'car':
      return (
        <svg {...base}>
          <path d="M5 13l1.6-4.8A2 2 0 0 1 8.5 7h7a2 2 0 0 1 1.9 1.2L19 13" />
          <rect x="4" y="13" width="16" height="5" rx="1.5" />
          <circle cx="7.5" cy="18" r="1.6" />
          <circle cx="16.5" cy="18" r="1.6" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...base}>
          <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
          <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...base}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'user':
      return (
        <svg {...base}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...base}>
          <rect x="3.5" y="11" width="17" height="10" rx="2" />
          <path d="M7.5 11V7a4.5 4.5 0 0 1 9 0v4" />
        </svg>
      );
    case 'id':
      return (
        <svg {...base}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="12" r="2.3" />
          <path d="M14 10.2h4M14 13.8h4" />
        </svg>
      );
    case 'inbox':
      return (
        <svg {...base}>
          <path d="M4 13l2.4-7.2A2 2 0 0 1 8.3 4.5h7.4a2 2 0 0 1 1.9 1.3L20 13" />
          <path d="M4 13v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
          <path d="M4 13h5l1 2h4l1-2h5" />
        </svg>
      );
    case 'search':
      return (
        <svg {...base}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...base}>
          <path d="M21 12a8 8 0 0 1-11.3 7.3L4 21l1.7-5.7A8 8 0 1 1 21 12z" />
        </svg>
      );
    default:
      return null;
  }
};

export default Icon;
