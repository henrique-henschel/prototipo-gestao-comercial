/**
 * Junta classes CSS ignorando valores falsos: cx('a', cond && 'b') → "a b".
 * @param {...(string | false | null | undefined)} classes
 */
export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}
