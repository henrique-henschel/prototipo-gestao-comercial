import { useCallback } from 'react';
import { UNDO_WINDOW_MS } from '@/domain/constants.js';
import { useSettings } from '@/hooks/useSettings.js';
import { useToast } from '@/hooks/useToast.js';

/**
 * Os valores atuais dos campos que vão mudar, no mesmo formato da alteração (inclusive
 * `paymentMethods` e `fees` pela metade): é o que o "Desfazer" grava de volta.
 * @param {object} current ajustes ou negócio atuais
 * @param {object} changes
 */
export function previousValues(current, changes) {
  return Object.fromEntries(
    Object.entries(changes).map(([key, value]) => [
      key,
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.keys(value).map((inner) => [inner, current[key]?.[inner]]))
        : current[key],
    ]),
  );
}

/**
 * Salva ajustes ou dados do negócio na hora (atualização otimista) e mostra o aviso com
 * "Desfazer", em vez de pedir confirmação. Se o serviço falhar, a tela volta sozinha ao
 * que era e o aviso explica o erro.
 * @returns {(input: { settings?: object, business?: object, message: string }) => Promise<boolean>}
 */
export function useSaveSettings() {
  const { settings, business, updateSettings, updateBusiness } = useSettings();
  const toast = useToast();

  return useCallback(
    async ({ settings: settingsChanges, business: businessChanges, message }) => {
      const undo = {
        settings: settingsChanges && previousValues(settings, settingsChanges),
        business: businessChanges && previousValues(business, businessChanges),
      };
      const apply = (values) =>
        Promise.all([
          values.settings && updateSettings(values.settings),
          values.business && updateBusiness(values.business),
        ]);

      try {
        await apply({ settings: settingsChanges, business: businessChanges });
      } catch (error) {
        toast.show({ message: error.message, tone: 'danger' });
        return false;
      }
      toast.show({
        message,
        duration: UNDO_WINDOW_MS,
        action: {
          label: 'Desfazer',
          onClick: () =>
            apply(undo).then(
              () => toast.show({ message: 'Ajuste desfeito', tone: 'info' }),
              (error) => toast.show({ message: error.message, tone: 'danger' }),
            ),
        },
      });
      return true;
    },
    [settings, business, updateSettings, updateBusiness, toast],
  );
}
