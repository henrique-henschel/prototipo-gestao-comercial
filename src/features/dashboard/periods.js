import { diffInDays } from '@/lib/date.js';
import { formatBRL } from '@/domain/rules/money.js';

/**
 * Períodos do Início. Cada um compara com o período anterior de mesma duração, cortado
 * na hora de agora (regra 7); `against` diz com o que, em palavras simples, uma vez só
 * acima dos indicadores.
 */
export const DASHBOARD_PERIODS = [
  {
    value: 'hoje',
    label: 'Hoje',
    against: () => 'ontem até esta hora',
  },
  {
    value: '7dias',
    label: 'Últimos 7 dias',
    against: () => 'os 7 dias antes',
  },
  {
    value: 'este_mes',
    label: 'Este mês',
    against: (period) => `os ${diffInDays(period.start, period.end) + 1} dias antes`,
  },
];

export const DEFAULT_DASHBOARD_PERIOD = 'hoje';

/**
 * Variação para o `StatCard` (`delta`), em reais: "R$ 12,00 a mais". Diferença em
 * dinheiro, e não em %, porque é mais fácil de entender e continua valendo quando o valor
 * de antes era zero ou negativo (o lucro). Nos indicadores do Início, subir é sempre bom.
 * @param {{ difference: number }} comparison resultado de `compareValues` (centavos)
 * @returns {{ text: string, direction: 'up'|'down'|'flat', positive: boolean }}
 */
export function deltaOf(comparison) {
  if (comparison.difference === 0) return { text: 'Igual', direction: 'flat', positive: true };
  const up = comparison.difference > 0;
  return {
    text: `${formatBRL(Math.abs(comparison.difference))} a ${up ? 'mais' : 'menos'}`,
    direction: up ? 'up' : 'down',
    positive: up,
  };
}
