import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ChevronRight, RotateCcw, SearchX, UserPlus } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { PageHeader } from '@/components/layout';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  ChipGroup,
  EmptyState,
  SearchBar,
  Skeleton,
  StatusPill,
} from '@/components/ui';
import { customerFiadoSummary } from '@/domain/rules/fiado.js';
import { formatBRL } from '@/domain/rules/money.js';
import { useCustomers } from '@/hooks/useCustomers.js';
import { useDataStatus } from '@/hooks/useData.js';
import { useFiado } from '@/hooks/useFiado.js';
import { useToast } from '@/hooks/useToast.js';
import { formatPhone, plural } from '@/lib/format.js';
import { normalizeSearch } from '@/lib/text.js';
import { CustomerFormSheet } from '../components/CustomerFormSheet.jsx';
import styles from './CustomersPage.module.css';

/** Filtros da lista. Arquivados só aparecem no próprio filtro. */
const FILTERS = [
  { value: 'todos', label: 'Todos', match: ({ customer }) => !customer.archived },
  {
    value: 'devendo',
    label: 'Devendo',
    match: ({ customer, summary }) => !customer.archived && summary.openCents > 0,
  },
  {
    value: 'sem_fiado',
    label: 'Sem fiado',
    match: ({ customer }) => !customer.archived && customer.fiadoBlocked,
  },
  { value: 'arquivados', label: 'Arquivados', match: ({ customer }) => customer.archived },
];
const DEFAULT_FILTER = 'todos';

/**
 * Clientes (seção 4 de docs/regras-de-negocio.md): lista em ordem alfabética com a situação
 * do fiado, filtros (devendo, sem fiado, arquivados), busca e "Cliente novo". Cada cliente
 * abre a conta, onde ficam o histórico, o limite, o bloqueio, arquivar e apagar.
 */
export default function CustomersPage() {
  const [params, setParams] = useSearchParams();
  const { status, reload } = useDataStatus();
  const { customers } = useCustomers();
  const { accounts } = useFiado();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const filter = FILTERS.find((f) => f.value === params.get('mostrar')) ?? FILTERS[0];

  const rows = useMemo(
    () =>
      customers
        .map((customer) => ({ customer, summary: customerFiadoSummary(customer, accounts) }))
        .sort((a, b) => a.customer.name.localeCompare(b.customer.name, 'pt-BR')),
    [customers, accounts],
  );
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.value, rows.filter(f.match).length])),
    [rows],
  );
  const visible = useMemo(() => {
    const term = normalizeSearch(query.trim());
    const digits = query.replace(/\D/g, '');
    return rows
      .filter(filter.match)
      .filter(
        ({ customer }) =>
          !term ||
          normalizeSearch(customer.name).includes(term) ||
          normalizeSearch(customer.note).includes(term) ||
          (digits.length >= 3 && customer.phone?.includes(digits)),
      );
  }, [rows, filter, query]);

  const setFilter = (value) => {
    const next = new URLSearchParams(params);
    if (value === DEFAULT_FILTER) next.delete('mostrar');
    else next.set('mostrar', value);
    setParams(next, { replace: true });
  };

  const openForm = () => {
    setFormKey((key) => key + 1);
    setFormOpen(true);
  };

  const header = (
    <PageHeader
      title="Clientes"
      description="Quem compra com você. Toque no nome para ver a conta e o histórico."
      actions={
        <Button icon={UserPlus} onClick={openForm} disabled={status !== 'ready'}>
          Cliente novo
        </Button>
      }
    />
  );

  const form = (
    <CustomerFormSheet
      key={formKey}
      open={formOpen}
      onClose={() => setFormOpen(false)}
      onSaved={(customer) => {
        setFormOpen(false);
        toast.show({ message: 'Cliente cadastrado', description: customer.name, tone: 'success' });
      }}
    />
  );

  if (status === 'loading') {
    return (
      <>
        {header}
        <div className={styles.list} aria-busy="true" aria-label="Carregando os clientes">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} shape="rect" height="4.5rem" />
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
            title="Não deu para carregar os clientes"
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

  if (customers.length === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            emoji="🙋"
            title="Você ainda não tem clientes"
            description="Cadastre quem compra fiado para saber quanto cada um deve e cobrar pelo WhatsApp."
            action={
              <Button icon={UserPlus} onClick={openForm}>
                Cadastrar o primeiro cliente
              </Button>
            }
          />
        </Card>
        {form}
      </>
    );
  }

  return (
    <>
      {header}

      <div className={styles.filters}>
        <ChipGroup label="Mostrar">
          {FILTERS.map((option) => (
            <Chip
              key={option.value}
              selected={filter.value === option.value}
              count={counts[option.value]}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </ChipGroup>
        <SearchBar
          value={query}
          onChange={setQuery}
          label="Procurar cliente"
          placeholder="Nome, apelido ou WhatsApp…"
        />
      </div>

      <p className={styles.summary} aria-live="polite">
        {plural(visible.length, 'cliente')}
      </p>

      {visible.length === 0 ? (
        <Card>
          {query ? (
            <EmptyState
              icon={SearchX}
              title="Ninguém encontrado"
              description="Procure de outro jeito ou cadastre."
            />
          ) : (
            <EmptyState
              emoji={filter.value === 'arquivados' ? '🗄️' : '🙌'}
              title={
                filter.value === 'arquivados'
                  ? 'Nenhum cliente arquivado'
                  : filter.value === 'devendo'
                    ? 'Ninguém está devendo'
                    : 'Ninguém aqui'
              }
            />
          )}
        </Card>
      ) : (
        <ul role="list" className={styles.list} aria-label="Clientes">
          {visible.map(({ customer, summary }) => (
            <li key={customer.id}>
              <Card
                as={Link}
                to={ROUTES.fiadoCustomer(customer.id)}
                state={{ from: 'clientes' }}
                interactive
                padding="sm"
                className={styles.row}
              >
                <Avatar name={customer.name} />
                <span className={styles.text}>
                  <span className={styles.name}>{customer.name}</span>
                  <span className={styles.meta}>
                    {customer.note && <span>{customer.note} · </span>}
                    <span className={styles.phone}>
                      {customer.phone ? formatPhone(customer.phone) : 'Sem WhatsApp'}
                    </span>
                  </span>
                </span>
                <span className={styles.end}>
                  {summary.balanceCents > 0 ? (
                    <span className={styles.debt}>
                      <span className="visually-hidden">Deve </span>
                      {formatBRL(summary.balanceCents)}
                    </span>
                  ) : summary.balanceCents < 0 ? (
                    <span className={styles.credit}>Crédito {formatBRL(-summary.balanceCents)}</span>
                  ) : (
                    <span className={styles.clear}>Não deve</span>
                  )}
                  <span className={styles.pills}>
                    {summary.openCents > 0 && <StatusPill status={summary.status} />}
                    {customer.fiadoBlocked && <StatusPill status="bloqueado" />}
                    {customer.archived && <Badge>Arquivado</Badge>}
                  </span>
                </span>
                <ChevronRight className={styles.chevron} size={22} aria-hidden="true" />
              </Card>
            </li>
          ))}
        </ul>
      )}

      {form}
    </>
  );
}
