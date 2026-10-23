import { useState } from 'react';
import { Check } from 'lucide-react';
import { BottomSheet, Button, Input, MoneyInput, PercentInput } from '@/components/ui';
import { formatBRL, percentOf } from '@/domain/rules/money.js';
import { validateBusiness } from '@/domain/rules/settings.js';
import { formatPhone } from '@/lib/format.js';
import styles from './SettingsSheets.module.css';

/** Venda de exemplo para explicar a taxa: R$ 100,00. */
const FEE_EXAMPLE_CENTS = 10000;

/**
 * Janelas de edição dos Ajustes. Cada uma tem uma ação principal ("Salvar ...") e é
 * remontada com `key` ao abrir, para partir do valor atual. `onSave` devolve se deu certo.
 */

/**
 * Nome e WhatsApp do negócio (aparecem no recibo, na cobrança e no relatório).
 * @param {{ open: boolean, onClose: () => void, business: import('@/domain/models.js').Business,
 *   onSave: (changes: { name: string, phone: string }) => Promise<boolean> }} props
 */
export function BusinessSheet({ open, onClose, business, onSave }) {
  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(formatPhone(business.phone));
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const codes = validateBusiness({ name, phone });
    setErrors(codes);
    if (codes.length > 0) return;
    setSaving(true);
    const saved = await onSave({ name, phone });
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Seu negócio"
      description="O nome aparece no recibo, na cobrança do fiado e nos relatórios."
      footer={
        <Button type="submit" form="negocio" size="lg" icon={Check} loading={saving}>
          Salvar
        </Button>
      }
    >
      <form id="negocio" className={styles.form} onSubmit={submit} noValidate>
        <Input
          label="Nome do negócio"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.includes('nome_obrigatorio') ? 'Digite o nome do negócio.' : undefined}
          autoComplete="organization"
        />
        <Input
          label="WhatsApp do negócio"
          optional
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          hint="Com DDD, como (11) 98765-4321."
          error={errors.includes('whatsapp_invalido') ? 'Confira o WhatsApp: DDD e número.' : undefined}
          autoComplete="tel"
        />
      </form>
    </BottomSheet>
  );
}

/**
 * Chave Pix (regra 2.2). Pode ficar vazia.
 * @param {{ open: boolean, onClose: () => void, pixKey: string,
 *   onSave: (pixKey: string) => Promise<boolean> }} props
 */
export function PixKeySheet({ open, onClose, pixKey, onSave }) {
  const [value, setValue] = useState(pixKey);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const saved = await onSave(value.trim());
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Chave Pix"
      description="Aparece na hora de receber por Pix e na mensagem de cobrança do fiado."
      footer={
        <Button type="submit" form="chave-pix" size="lg" icon={Check} loading={saving}>
          Salvar chave Pix
        </Button>
      }
    >
      <form id="chave-pix" className={styles.form} onSubmit={submit} noValidate>
        <Input
          label="Sua chave Pix"
          optional
          value={value}
          onChange={(event) => setValue(event.target.value)}
          hint="Pode ser CPF, celular, e-mail ou a chave aleatória. Deixe vazio se não usa Pix."
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </BottomSheet>
  );
}

/**
 * Uma taxa da maquininha (regra 2.3), no teclado próprio, com o exemplo numa venda de
 * R$ 100,00 acima do teclado.
 * @param {{ open: boolean, onClose: () => void, label: string, value: number,
 *   onSave: (value: number) => Promise<boolean> }} props
 */
export function FeeSheet({ open, onClose, label, value, onSave }) {
  const [rate, setRate] = useState(value);
  const [saving, setSaving] = useState(false);
  const feeCents = percentOf(FEE_EXAMPLE_CENTS, rate);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const saved = await onSave(rate);
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Taxa: ${label}`}
      description="Quanto a maquininha cobra de você. O cliente paga o mesmo valor; a taxa entra no lucro."
      footer={
        <Button type="submit" form="taxa" size="lg" icon={Check} loading={saving}>
          Salvar taxa
        </Button>
      }
    >
      <form id="taxa" className={styles.form} onSubmit={submit} noValidate>
        <p className={styles.preview} aria-live="polite">
          {rate === 0 ? (
            'Sem taxa: numa venda de R$ 100,00, entram R$ 100,00.'
          ) : (
            <>
              Numa venda de R$ 100,00, a taxa é <strong>{formatBRL(feeCents)}</strong> e entram{' '}
              <strong>{formatBRL(FEE_EXAMPLE_CENTS - feeCents)}</strong>.
            </>
          )}
        </p>
        <PercentInput label={`Taxa do ${label.toLowerCase()}`} value={rate} onChange={setRate} keypad />
      </form>
    </BottomSheet>
  );
}

/**
 * Troco inicial padrão do caixa (regra 6.1), sugerido ao abrir o caixa.
 * @param {{ open: boolean, onClose: () => void, value: number,
 *   onSave: (cents: number) => Promise<boolean> }} props
 */
export function DefaultOpeningSheet({ open, onClose, value, onSave }) {
  const [cents, setCents] = useState(value);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const saved = await onSave(cents);
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Troco inicial padrão"
      description="Quanto você costuma deixar na gaveta para troco. Ele já vem preenchido ao abrir o caixa."
      footer={
        <Button type="submit" form="troco-padrao" size="lg" icon={Check} loading={saving}>
          Salvar troco inicial
        </Button>
      }
    >
      <form id="troco-padrao" className={styles.form} onSubmit={submit} noValidate>
        <MoneyInput label="Troco inicial" value={cents} onChange={setCents} keypad />
      </form>
    </BottomSheet>
  );
}
