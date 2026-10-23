import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { CircleAlert, NotebookText, RotateCcw, SearchX, Users, Wallet } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { PageHeader } from '@/components/layout';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  EmptyState,
  SearchBar,
  Select,
  Skeleton,
  StatCard,
} from '@/components/ui';
import { FIADO_STATUS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { useDataStatus } from '@/hooks/useData.js';
import { useFiado } from '@/hooks/useFiado.js';
import { formatPercent, plural } from '@/lib/format.js';
import { normalizeSearch } from '@/lib/text.js';
import { CustomerPicker } from '@/features/sales/components/CustomerPicker.jsx';
import { DebtorRow } from '../components/DebtorRow.jsx';
import styles from './FiadoPage.module.css';

/** Filtros de situação: cada um junta status de `domain/rules/fiado.js`. */
const SITUATIONS = [
  { value: 'todos', label: 'Todos', statuses: null },
  { value: 'atrasados', label: 'Atrasados', statuses: [FIADO_STATUS.ATRASADO] },
  { value: 'logo', label: 'Vencem logo', statuses: [FIADO_STATUS.VENCE_HOJE, FIADO_STATUS.VENCE_EM_BREVE] },
  { value: 'em_dia', label: 'Em dia', statuses: [FIADO_STATUS.EM_DIA] },
];
const ORDERS = [
  { value: 'urgencia', label: 'Quem está mais atrasado' },
  { value: 'valor', label: 'Quem deve mais' },
];
const DEFAULT_SITUATION = 'todos';
const DEFAULT_ORDER = 'urgencia';

/**
 * "Quem me deve" (regras 3.6 e 3.10): indicadores do fiado e a lista de quem deve, do mais
 * urgente para o menos (ou da maior dívida para a menor), com filtros na barra de endereço,
 * busca e "Cobrar no WhatsApp". "Receber pagamento" pergunta quem está pagando e abre a conta.
 */
export default function FiadoPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { status, reload } = useDataStatus();
  const { debtors, indicators } = useFiado();
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);

  const situation = SITUATIONS.find((s) => s.value === params.get('situacao')) ?? SITUATIONS[0];
  const order = ORDERS.some((o) => o.value === params.get('ordem')) ? params.get('ordem') : DEFAULT_ORDER;

  const counts = useMemo(
    () =>
      Object.fromEntries(
        SITUATIONS.map((s) => [
          s.value,
          s.statuses ? debtors.filter((row) => s.statuses.includes(row.status)).length : debtors.length,
        ]),
      ),
    [debtors],
  );

  const rows = useMemo(() => {
    const term = normalizeSearch(query.trim());
    const filtered = debtors
      .filter((row) => !situation.statuses || situation.statuses.includes(row.status))
      .filter(
        (row) =>
          !term ||
          normalizeSearch(row.customer.name).includes(term) ||
          normalizeSearch(row.customer.note).includes(term),
      );
    // `debtors` já vem por urgência; "Maior dívida" reordena pelo valor.
    return order === 'valor' ? [...filtered].sort((a, b) => b.balanceCents - a.balanceCents) : filtered;
  }, [debtors, situation, order, query]);

  const setFilter = (key, value, fallback) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const header = (
    <PageHeader
      title="Quem me deve"
      description="Quem comprou fiado, quanto deve e até quando."
      actions={
        status === 'ready' &&
        debtors.length > 0 && (
          <Button
            icon={Wallet}
            onClick={() => {
              setPickerKey((key) => key + 1);
              setPickerOpen(true);
            }}
          >
            Receber pagamento
          </Button>
        )
      }
    />
  );

  if (status === 'loading') {
    return (
      <>
        {header}
        <div className={styles.loading} aria-busy="true" aria-label="Carregando o fiado">
          <div className={styles.stats}>
            {Array.from({ length: 2 }, (_, index) => (
              <Skeleton key={index} shape="rect" height="6rem" />
            ))}
          </div>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} shape="rect" height="7rem" />
          ))}
        </div>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            tone="danger"
            emoji="📡"
            title="Não deu para carregar o fiado"
            description="Confira a internet e tente de novo."
            action={
              <Button icon={RotateCcw} onClick={reload}>
                Tentar de novo
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  if (debtors.length === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            emoji="🎉"
            title="Ninguém está devendo"
            description="Quando você vender fiado, quem comprou aparece aqui, com o valor e o dia de pagar."
            action={
              <Button as={Link} to={ROUTES.customers} variant="secondary" icon={Users}>
                Ver clientes
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      {header}

      <section aria-label="Resumo do fiado" className={styles.stats}>
        <StatCard
          label="Para receber"
          value={formatBRL(indicators.receivableCents)}
          icon={NotebookText}
          tone="accent"
          hint={`${plural(indicators.debtorsCount, 'cliente')} devendo`}
        />
        <StatCard
          label="Atrasado"
          value={formatBRL(indicators.overdueCents)}
          icon={CircleAlert}
          tone={indicators.overdueCents > 0 ? 'danger' : 'success'}
          hint={
            indicators.overdueCents > 0
              ? `${plural(indicators.overdueCount, 'cliente')} · ${formatPercent(indicators.defaultRate)} do total`
              : 'Nenhuma conta atrasada'
          }
        />
      </section>

      <div className={styles.filters}>
        <ChipGroup label="Situação">
          {SITUATIONS.map((option) => (
            <Chip
              key={option.value}
              selected={situation.value === option.value}
              count={counts[option.value]}
              onClick={() => setFilter('situacao', option.value, DEFAULT_SITUATION)}
            >
              {option.label}
            </Chip>
          ))}
        </ChipGroup>
        <div className={styles.searchRow}>
          <SearchBar
            value={query}
            onChange={setQuery}
            label="Procurar cliente"
            placeholder="Nome ou apelido…"
          />
          <Select
            label="Mostrar primeiro"
            options={ORDERS}
            value={order}
            onChange={(event) => setFilter('ordem', event.target.value, DEFAULT_ORDER)}
          />
        </div>
      </div>

      <p className={styles.summary} aria-live="polite">
        {plural(rows.length, 'cliente')}
      </p>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="Ninguém encontrado"
            description="Mude o filtro ou procure de outro jeito."
          />
        </Card>
      ) : (
        <ul role="list" className={styles.list} aria-label="Quem me deve">
          {rows.map((row) => (
            <li key={row.customer.id}>
              <DebtorRow row={row} />
            </li>
          ))}
        </ul>
      )}

      <CustomerPicker
        key={pickerKey}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedId={null}
        onlyDebtors
        title="Quem está pagando?"
        onSelect={(customerId) => {
          setPickerOpen(false);
          navigate(`${ROUTES.fiadoCustomer(customerId)}?receber=1`);
        }}
      />
    </>
  );
}
