import { utcToZonedTime, format } from 'date-fns-tz';

const TZ = 'America/Mexico_City';

/**
 * Devuelve Date en horario México desde UTC
 */
export function nowMX() {
  return utcToZonedTime(new Date(), TZ);
}

/**
 * Fecha DD/MM/YYYY en México
 */
export function todayMX() {
  return format(nowMX(), 'dd/MM/yyyy', { timeZone: TZ });
}

/**
 * Hora HH:mm:ss en México
 */
export function timeMX() {
  return format(nowMX(), 'HH:mm:ss', { timeZone: TZ });
}

/**
 * ¿Es después de las 4:00 PM en México?
 */
export function isAfter4PM() {
  const h = parseInt(format(nowMX(), 'HH', { timeZone: TZ }));
  const m = parseInt(format(nowMX(), 'mm', { timeZone: TZ }));
  return h > 16 || (h === 16 && m >= 0);
}

/**
 * Minutos restantes para las 4 PM
 */
export function minutesUntil4PM() {
  const now = nowMX();
  const fourPM = new Date(now);
  fourPM.setHours(16, 0, 0, 0);

  const diff = Math.floor((fourPM - now) / 60000);
  if (diff <= 0) return { horas: 0, minutos: 0, totalMinutos: 0 };

  return {
    horas: Math.floor(diff / 60),
    minutos: diff % 60,
    totalMinutos: diff,
  };
}
