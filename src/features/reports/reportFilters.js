import { PERIOD_PRESETS, REPORT_TYPES } from '@/domain/constants.js';
import { customPeriod, periodFromPreset } from '@/domain/rules/period.js';
import { startOfMonth, today as todayISO } from '@/lib/date.js';

/**
 * Filtros dos relatórios guardados na barra de endereço:
 * `?tipo=vendas&periodo=7dias`, ou `?periodo=personalizado&de=2026-10-01&ate=2026-10-15`.
 * Valores desconhecidos voltam ao padrão.
 */

export const DEFAULT_REPORT_TYPE = 'resumo';
export const DEFAULT_REPORT_PERIOD = 'este_mes';
export const CUSTOM_PERIOD = 'personalizado';

/**
 * @param {URLSearchParams} params
 * @param {string} [today]
 * @returns {{ type: string, preset: string, period: import('@/domain/models.js').Period|null,
 *   from: string, to: string }} `period` nulo quando as datas escolhidas não valem
 */
export function readReportFilters(params, today = todayISO()) {
  const type = REPORT_TYPES.some((option) => option.value === params.get('tipo'))
    ? params.get('tipo')
    : DEFAULT_REPORT_TYPE;
  const preset = PERIOD_PRESETS.some((option) => option.value === params.get('periodo'))
    ? params.get('periodo')
    : DEFAULT_REPORT_PERIOD;

  if (preset !== CUSTOM_PERIOD) {
    const period = periodFromPreset(preset, today);
    return { type, preset, period, from: period.start, to: period.end };
  }
  const from = params.get('de') ?? '';
  const to = params.get('ate') ?? '';
  return { type, preset, period: customPeriod(from, to, today), from, to };
}

/**
 * Próximos parâmetros ao mudar um filtro. Os padrões saem da barra de endereço; ao
 * escolher "Escolher datas", começa do primeiro dia do mês até hoje.
 * @param {URLSearchParams} params atuais
 * @param {{ type?: string, preset?: string, from?: string, to?: string }} changes
 * @param {string} [today]
 */
export function nextReportParams(params, changes, today = todayISO()) {
  const next = new URLSearchParams(params);
  const set = (name, value, fallback) =>
    value === fallback || !value ? next.delete(name) : next.set(name, value);

  if (changes.type !== undefined) set('tipo', changes.type, DEFAULT_REPORT_TYPE);
  if (changes.preset !== undefined) {
    set('periodo', changes.preset, DEFAULT_REPORT_PERIOD);
    if (changes.preset === CUSTOM_PERIOD) {
      if (!next.get('de')) next.set('de', startOfMonth(today));
      if (!next.get('ate')) next.set('ate', today);
    } else {
      next.delete('de');
      next.delete('ate');
    }
  }
  if (changes.from !== undefined) set('de', changes.from);
  if (changes.to !== undefined) set('ate', changes.to);
  return next;
}
