import { useCallback, useEffect, useState } from 'react';
import { getReport } from '@/services/reports.service.js';

/**
 * Busca um relatório (`getReport`) e acompanha o carregamento. Enquanto o próximo
 * chega, o anterior continua na tela (`status: 'loading'` com `report`), para a página
 * não piscar a cada troca de filtro.
 * @param {string} type
 * @param {import('@/domain/models.js').Period|null} period nulo: nada a buscar
 * @returns {{ status: 'idle'|'loading'|'ready'|'error', report: Awaited<ReturnType<typeof getReport>>|null,
 *   error: Error|null, retry: () => void }}
 */
export function useReport(type, period) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, report: null, error: null });
  const start = period?.start;
  const end = period?.end;
  const key = period ? `${type}|${start}|${end}|${attempt}` : null;

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    getReport({ type, period: { start, end } }).then(
      (report) => active && setResult({ key, report, error: null }),
      (error) => active && setResult((previous) => ({ key, report: previous.report, error })),
    );
    return () => {
      active = false;
    };
  }, [key, type, start, end]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  let status = 'idle';
  if (key) status = result.key !== key ? 'loading' : result.error ? 'error' : 'ready';
  return { status, report: result.report, error: result.key === key ? result.error : null, retry };
}
