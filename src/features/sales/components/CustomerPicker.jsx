import { useMemo, useState } from 'react';
import { Check, UserPlus, UserRoundX } from 'lucide-react';
import { Avatar, BottomSheet, Button, EmptyState, Input, SearchBar, StatusPill } from '@/components/ui';
import { customerFiadoSummary } from '@/domain/rules/fiado.js';
import { formatBRL } from '@/domain/rules/money.js';
import { useCustomers } from '@/hooks/useCustomers.js';
import { useFiado } from '@/hooks/useFiado.js';
import { today } from '@/lib/date.js';
import { cx } from '@/lib/cx.js';
import styles from './CustomerPicker.module.css';

function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Escolha de quem está comprando (obrigatório no fiado, regra 1.5), com a situação
 * do fiado de cada cliente e o cadastro rápido (só nome e WhatsApp, seção 4).
 * Remonte com `key` ao abrir, para limpar a busca.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string|null} props.selectedId
 * @param {(customerId: string|null) => void} props.onSelect
 */
export function CustomerPicker({ open, onClose, selectedId, onSelect }) {
  const { customers, createCustomer } = useCustomers();
  const { accounts } = useFiado();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => {
    const term = normalize(query.trim());
    const day = today();
    return customers
      .filter((customer) => !customer.archived)
      .filter(
        (customer) =>
          !term ||
          normalize(customer.name).includes(term) ||
          normalize(customer.note).includes(term) ||
          customer.phone?.includes(term),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map((customer) => ({ customer, summary: customerFiadoSummary(customer, accounts, day) }));
  }, [customers, accounts, query]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={creating ? 'Cliente novo' : 'Quem está comprando?'}
      description={creating ? 'Só o nome já basta. O WhatsApp serve para mandar recibo e cobrar.' : undefined}
    >
      {creating ? (
        <QuickCustomerForm
          initialName={query}
          onCancel={() => setCreating(false)}
          onCreate={async (input) => {
            const customer = await createCustomer(input);
            onSelect(customer.id);
          }}
        />
      ) : (
        <div className={styles.picker}>
          <SearchBar
            value={query}
            onChange={setQuery}
            label="Procurar cliente"
            placeholder="Nome ou apelido…"
          />
          <div className={styles.actions}>
            <Button variant="secondary" icon={UserPlus} onClick={() => setCreating(true)}>
              Cadastrar cliente novo
            </Button>
            {selectedId && (
              <Button variant="ghost" icon={UserRoundX} onClick={() => onSelect(null)}>
                Vender sem cliente
              </Button>
            )}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              compact
              emoji="🙋"
              title={query ? 'Ninguém com esse nome' : 'Você ainda não tem clientes'}
              description="Cadastre agora: leva só alguns segundos."
            />
          ) : (
            <ul role="list" className={styles.list} aria-label="Clientes">
              {rows.map(({ customer, summary }) => {
                const selected = customer.id === selectedId;
                return (
                  <li key={customer.id}>
                    <button
                      type="button"
                      className={cx(styles.row, selected && styles.selected)}
                      aria-pressed={selected}
                      onClick={() => onSelect(customer.id)}
                    >
                      <Avatar name={customer.name} />
                      <span className={styles.text}>
                        <span className={styles.name}>{customer.name}</span>
                        {customer.note && <span className={styles.note}>{customer.note}</span>}
                      </span>
                      <span className={styles.status}>
                        {customer.fiadoBlocked ? (
                          <StatusPill status="bloqueado" />
                        ) : (
                          summary.openCents > 0 && <StatusPill status={summary.status} />
                        )}
                        {summary.openCents > 0 && (
                          <span className={styles.balance}>Deve {formatBRL(summary.openCents)}</span>
                        )}
                      </span>
                      {selected && <Check className={styles.check} size={22} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

/** Cadastro rápido dentro da venda: nome e WhatsApp. */
function QuickCustomerForm({ initialName, onCancel, onCreate }) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onCreate({ name, phone });
    } catch (error) {
      const codes = error.codes ?? [];
      setErrors({
        name: codes.includes('nome_obrigatorio') ? 'Digite o nome.' : undefined,
        phone: codes.includes('whatsapp_invalido') ? error.message : undefined,
        form: codes.some((code) => code === 'nome_obrigatorio' || code === 'whatsapp_invalido')
          ? undefined
          : error.message,
      });
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Input
        label="Nome"
        value={name}
        onChange={(event) => setName(event.target.value)}
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
        onChange={(event) => setPhone(event.target.value)}
        error={errors.phone}
        hint="Com DDD. Ex.: (11) 98765-4321"
        autoComplete="off"
      />
      {errors.form && (
        <p className={styles.formError} role="alert">
          {errors.form}
        </p>
      )}
      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onCancel}>
          Voltar para a lista
        </Button>
        <Button type="submit" icon={Check} loading={saving}>
          Salvar e escolher
        </Button>
      </div>
    </form>
  );
}
