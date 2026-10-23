import { useState } from 'react';
import { Check } from 'lucide-react';
import { BottomSheet, Button, Input, MoneyInput, Switch } from '@/components/ui';
import { validateCustomer } from '@/domain/rules/customers.js';
import { useCustomers } from '@/hooks/useCustomers.js';
import { formatPhone } from '@/lib/format.js';
import styles from './CustomerFormSheet.module.css';

const FIELD_MESSAGES = {
  nome_obrigatorio: 'Digite o nome.',
  whatsapp_invalido: 'Confira o WhatsApp: DDD e número, como (11) 98765-4321.',
  limite_invalido: 'Digite o limite ou desligue o limite do fiado.',
};

/**
 * Cadastro e edição de cliente (seção 4 de docs/regras-de-negocio.md): nome, WhatsApp,
 * apelido ou observação, limite do fiado e "Não vender fiado". Valida com as regras
 * antes de enviar, porque a edição é otimista. Remonte com `key` ao abrir.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {import('@/domain/models.js').Customer|null} [props.customer] nulo para cliente novo
 * @param {(customer: import('@/domain/models.js').Customer) => void} props.onSaved
 */
export function CustomerFormSheet({ open, onClose, customer = null, onSaved }) {
  const { createCustomer, updateCustomer } = useCustomers();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(formatPhone(customer?.phone));
  const [note, setNote] = useState(customer?.note ?? '');
  const [hasLimit, setHasLimit] = useState(customer?.creditLimitCents != null);
  const [limitCents, setLimitCents] = useState(customer?.creditLimitCents ?? 0);
  const [blocked, setBlocked] = useState(customer?.fiadoBlocked ?? false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const input = {
      name,
      phone,
      note,
      creditLimitCents: hasLimit ? limitCents : null,
      fiadoBlocked: blocked,
    };
    const codes = validateCustomer(input);
    if (hasLimit && !(limitCents > 0)) codes.push('limite_invalido');
    if (codes.length > 0) {
      setErrors({
        name: codes.includes('nome_obrigatorio') ? FIELD_MESSAGES.nome_obrigatorio : undefined,
        phone: codes.includes('whatsapp_invalido') ? FIELD_MESSAGES.whatsapp_invalido : undefined,
        limit: codes.includes('limite_invalido') ? FIELD_MESSAGES.limite_invalido : undefined,
      });
      return;
    }
    setSaving(true);
    try {
      const saved = customer ? await updateCustomer(customer.id, input) : await createCustomer(input);
      onSaved(saved);
    } catch (error) {
      setErrors({ form: error.message });
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={customer ? 'Editar cliente' : 'Cliente novo'}
      description={customer ? undefined : 'Só o nome já basta. O WhatsApp serve para mandar recibo e cobrar.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button type="submit" form="cliente-form" icon={Check} loading={saving}>
            {customer ? 'Salvar' : 'Cadastrar cliente'}
          </Button>
        </>
      }
    >
      <form id="cliente-form" className={styles.form} onSubmit={submit} noValidate>
        <Input
          label="Nome"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
          error={errors.name}
          autoComplete="off"
          maxLength={80}
        />
        <Input
          label="WhatsApp"
          optional
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setErrors((current) => ({ ...current, phone: undefined }));
          }}
          error={errors.phone}
          hint="Com DDD. Ex.: (11) 98765-4321"
          autoComplete="off"
        />
        <Input
          label="Apelido ou observação"
          optional
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ex.: Zé do gás"
          maxLength={80}
        />

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Fiado</legend>
          <Switch
            label="Limitar o fiado"
            description="Avisa na hora de vender se a dívida passar desse valor."
            checked={hasLimit}
            onChange={(checked) => {
              setHasLimit(checked);
              setErrors((current) => ({ ...current, limit: undefined }));
            }}
          />
          {hasLimit && (
            <MoneyInput
              label="Limite do fiado"
              value={limitCents}
              onChange={(value) => {
                setLimitCents(value);
                setErrors((current) => ({ ...current, limit: undefined }));
              }}
              size="md"
              error={errors.limit}
            />
          )}
          <Switch
            label="Não vender fiado para este cliente"
            description="Na hora de vender fiado, aparece um aviso. A decisão continua sendo sua."
            checked={blocked}
            onChange={setBlocked}
          />
        </fieldset>

        {errors.form && (
          <p className={styles.formError} role="alert">
            {errors.form}
          </p>
        )}
      </form>
    </BottomSheet>
  );
}
