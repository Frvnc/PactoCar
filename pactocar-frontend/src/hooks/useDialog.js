import { useEffect, useRef } from 'react';

// Accesibilidad de dialogos/modales:
// - cierra con la tecla Escape
// - mueve el foco al dialogo al abrir y lo devuelve al elemento previo al cerrar
export function useDialog(onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const anterior = document.activeElement;
    ref.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      if (anterior && typeof anterior.focus === 'function') anterior.focus();
    };
  }, []);

  return ref;
}
