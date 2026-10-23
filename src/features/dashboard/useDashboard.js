import { useMemo } from 'react';
import { FIADO_STATUS, STOCK_STATUS } from '@/domain/constants.js';
import {
  compareWithPrevious,
  dailySeries,
  paymentMix,
  periodMetrics,
  topProducts,
} from '@/domain/rules/metrics.js';
import { sumCents } from '@/domain/rules/money.js';
import { periodFromPreset } from '@/domain/rules/period.js';
import { stockStatus } from '@/domain/rules/stock.js';
import { useDataState } from '@/hooks/useData.js';
import { useFiado } from '@/hooks/useFiado.js';
import { today as todayISO } from '@/lib/date.js';

/**
 * Ordem das fatias da rosca por forma de pagamento. As cores são fixas por forma
 * (`PAYMENT_METHODS[x].chartSlot`); nesta ordem, toda fatia vizinha passa no validador de
 * daltonismo da skill dataviz (Pix ↔ débito e crédito ↔ fiado, os pares parecidos, nunca
 * se encostam). Não ordene por tamanho.
 */
export const PAYMENT_RING_ORDER = ['pix', 'credito', 'debito', 'fiado', 'dinheiro'];

/**
 * Números do Início, todos de `domain/rules/metrics.js` e `period.js`:
 * - `todayMetrics`: o destaque "Hoje você vendeu";
 * - `comparison`: indicadores do período escolhido × o período anterior (até esta hora);
 * - `series`: vendido por dia (últimos 7 dias, ou os dias do mês em "Este mês");
 * - `mix`: quanto entrou por forma, na ordem da rosca; `top`: mais vendidos;
 * - `alerts`: fiado atrasado ou vencendo e estoque acabado ou acabando.
 * @param {'hoje'|'7dias'|'este_mes'} preset
 */
export function useDashboard(preset) {
  const { sales, fiadoPayments, expenses, products } = useDataState();
  const { debtors, indicators } = useFiado();
  const today = todayISO();

  return useMemo(() => {
    const period = periodFromPreset(preset, today);
    const chartPeriod = preset === 'este_mes' ? period : periodFromPreset('7dias', today);
    const mixByMethod = Object.fromEntries(paymentMix(sales, period).map((row) => [row.method, row]));

    const stock = products.filter((product) => product.active && product.trackStock).map(stockStatus);
    const dueSoon = debtors.filter(
      (row) => row.status === FIADO_STATUS.VENCE_HOJE || row.status === FIADO_STATUS.VENCE_EM_BREVE,
    );

    return {
      period,
      todayMetrics: periodMetrics({ sales, fiadoPayments, expenses, period: { start: today, end: today } }),
      comparison: compareWithPrevious(
        { sales, fiadoPayments, expenses, period },
        { now: new Date().toISOString() },
      ),
      series: dailySeries(sales, chartPeriod),
      mix: PAYMENT_RING_ORDER.map((method) => mixByMethod[method]),
      top: topProducts(sales, period, 5),
      hasSales: sales.length > 0,
      alerts: {
        overdueCount: indicators.overdueCount,
        overdueCents: indicators.overdueCents,
        dueSoonCount: dueSoon.length,
        dueSoonCents: sumCents(dueSoon.map((row) => row.balanceCents)),
        outCount: stock.filter((status) => status === STOCK_STATUS.ACABOU).length,
        lowCount: stock.filter((status) => status === STOCK_STATUS.ACABANDO).length,
      },
    };
  }, [preset, today, sales, fiadoPayments, expenses, products, debtors, indicators]);
}
