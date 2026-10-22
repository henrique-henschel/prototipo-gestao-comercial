import { useDataActions, useDataState } from './useData.js';

/** Dados do negócio, ajustes que alteram regras, boas-vindas e restauração dos dados de exemplo. */
export function useSettings() {
  const { status, business, settings } = useDataState();
  const { updateSettings, updateBusiness, completeOnboarding, resetDemoData } = useDataActions();
  return { status, business, settings, updateSettings, updateBusiness, completeOnboarding, resetDemoData };
}
