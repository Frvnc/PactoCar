const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Formatea una fecha (DATE o ISO) como "06 ago 2026" sin desfase de zona horaria.
export const fmtFecha = (valor) => {
  if (!valor) return '';
  const [y, m, d] = String(valor).split('T')[0].split('-');
  const mes = MESES[Number(m) - 1] || m;
  return `${d} ${mes} ${y}`;
};

// Hora local "HH:MM" a partir de un timestamp.
export const fmtHora = (valor) => {
  if (!valor) return '';
  const d = new Date(valor);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
};

// URLs de los modulos (horneadas por Vite en build).
export const MODULOS = {
  pagos: import.meta.env.VITE_PAGOS_URL,
  contratos: import.meta.env.VITE_CONTRATOS_URL,
  reputacion: import.meta.env.VITE_REPUTACION_URL,
  chat: import.meta.env.VITE_CHAT_URL,
};

// Cantidad de dias entre dos fechas (solo la parte de la fecha).
export const diasEntre = (inicio, fin) => {
  const a = String(inicio).split('T')[0];
  const b = String(fin).split('T')[0];
  return Math.round((new Date(b) - new Date(a)) / 86400000);
};

// Etiquetas legibles para los estados de una reserva.
export const ESTADO_LABEL = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  en_curso: 'En curso',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
  completada: 'Completada',
};
