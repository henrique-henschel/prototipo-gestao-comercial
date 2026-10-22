import { cx } from '@/lib/cx.js';
import styles from './Avatar.module.css';

/** Iniciais do nome: "Maria da Silva" → "MS". */
function initials(name = '') {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 2 || /^[A-ZÀ-Ú]/.test(part));
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Matiz estável a partir do nome: a mesma pessoa tem sempre a mesma cor. */
function hueFromName(name = '') {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)) % 360;
  return hash;
}

/**
 * Avatar com iniciais e cor estável por pessoa (clientes, conta do usuário).
 * @param {object} props
 * @param {string} props.name
 * @param {'sm'|'md'|'lg'} [props.size='md']
 */
export function Avatar({ name, size = 'md', className }) {
  return (
    <span
      className={cx(styles.avatar, styles[size], className)}
      style={{ '--hue': hueFromName(name) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
