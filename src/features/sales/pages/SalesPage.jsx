import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { RotateCcw, SearchX, ShoppingCart } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { PageHeader } from '@/components/layout';
import { Button, Card, Chip, ChipGroup, EmptyState, SearchBar, Skeleton } from '@/components/ui';
import { PAYMENT_METHOD_KEYS, PAYMENT_METHODS, PERIOD_PRESETS } from '@/domain/constants.js';
import { formatBRL, sumCents } from '@/domain/rules/money.js';
import { filterByPeriod, periodFromPreset } from '@/domain/rules/period.js';
import { activeSales } from '@/domain/rules/sales.js';
import { useCustomers } from '@/hooks/useCustomers.js';
import { useDataStatus } from '@/hooks/useData.js';
import { useSales } from '@/hooks/useSales.js';
import { dateOf } from '@/lib/date.js';
import { formatDateLong, formatRelativeDay, plural } from '@/lib/format.js';
import { PAYMENT_ICONS } from '../paymentIcons.js';
import { SaleRow } from '../components/SaleRow.jsx';
import styles from './SalesPage.module.css';

const PERIODS = PERIOD_PRESETS.filter((preset) => preset.value !== 'personalizado');
const DEFAULT_PERIOD = 'hoje';
const ALL_METHODS = 'todas';
const PAGE_SIZE = 50;

function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** "Hoje, quinta-feira, 22 de outubro" / "Segunda-feira, 19 de outubro" */
function dayTitle(day) {
  const relative = formatRelativeDay(day);
  const long = formatDateLong(day);
  const text = relative === 'hoje' || relative === 'ontem' ? `${relative}, ${long}` : long;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Histórico de vendas: das mais novas para as mais antigas, agrupadas por dia, com
 * filtros de período e forma de pagamento (guardados na barra de endereço, para o
 * "voltar" do detalhe manter a lista como estava) e busca por número, cliente ou produto.
 */
export default function SalesPage() {
  const [params, setParams] = useSearchParams();
  const { status, reload } = useDataStatus();
  const { sales } = useSales();
  const { customers } = useCustomers();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const preset = PERIODS.some((p) => p.value === params.get('periodo'))
    ? params.get('periodo')
    : DEFAULT_PERIOD;
  const method = PAYMENT_METHOD_KEYS.includes(params.get('forma')) ? params.get('forma') : ALL_METHODS;

  const customerNames = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);

  const filtered = useMemo(() => {
    const term = normalize(query.trim().replace(/^n[ºo°]?\s*/i, ''));
    return filterByPeriod(sales, periodFromPreset(preset))
      .filter((sale) => method === ALL_METHODS || sale.payments.some((payment) => payment.method === method))
      .filter((sale) => {
        if (!term) return true;
        if (String(sale.number) === term) return true;
        const customer = customerNames.get(sale.customerId);
        if (customer && normalize(customer).includes(term)) return true;
        return sale.items.some((item) => normalize(item.name).includes(term));
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [sales, preset, method, query, customerNames]);

  const groups = useMemo(() => {
    const byDay = new Map();
    for (const sale of filtered.slice(0, limit)) {
      const day = dateOf(sale.createdAt);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(sale);
    }
    return [...byDay.entries()];
  }, [filtered, limit]);

  const active = activeSales(filtered);
  const soldCents = sumCents(active.map((sale) => sale.totalCents));

  const setFilter = (key, value, fallback) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setLimit(PAGE_SIZE);
    setParams(next, { replace: true });
  };

  const header = (
    <PageHeader
      title="Vendas"
      description="Todas as vendas, das mais novas para as mais antigas."
      actions={
        <Button as={Link} to={ROUTES.sell} icon={ShoppingCart}>
          Nova venda
        </Button>
      }
    />
  );

  if (status === 'loading') {
    return (
      <>
        {header}
        <div className={styles.list} aria-busy="true" aria-label="Carregando as vendas">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} shape="rect" height="5rem" />
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
            title="Não deu para carregar as vendas"
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

  const periodLabel = PERIODS.find((p) => p.value === preset).label.toLowerCase();

  return (
    <>
      {header}

      <div className={styles.filters}>
        <ChipGroup label="Período">
          {PERIODS.map((option) => (
            <Chip
              key={option.value}
              selected={preset === option.value}
              onClick={() => setFilter('periodo', option.value, DEFAULT_PERIOD)}
            >
              {option.label}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup label="Forma de pagamento">
          <Chip
            selected={method === ALL_METHODS}
            onClick={() => setFilter('forma', ALL_METHODS, ALL_METHODS)}
          >
            Todas as formas
          </Chip>
          {PAYMENT_METHOD_KEYS.map((key) => (
            <Chip
              key={key}
              icon={PAYMENT_ICONS[key]}
              selected={method === key}
              onClick={() => setFilter('forma', key, ALL_METHODS)}
            >
              {PAYMENT_METHODS[key].shortLabel ?? PAYMENT_METHODS[key].label}
            </Chip>
          ))}
        </ChipGroup>
        <SearchBar
          value={query}
          onChange={(value) => {
            setQuery(value);
            setLimit(PAGE_SIZE);
          }}
          label="Procurar venda"
          placeholder="Número, cliente ou produto…"
        />
      </div>

      <p className={styles.summary} aria-live="polite">
        {plural(active.length, 'venda')} · <strong>{formatBRL(soldCents)}</strong> vendidos ({periodLabel})
      </p>

      {filtered.length === 0 ? (
        <Card>
          {query || method !== ALL_METHODS ? (
            <EmptyState
              icon={SearchX}
              title="Nenhuma venda encontrada"
              description="Mude os filtros ou procure de outro jeito."
            />
          ) : (
            <EmptyState
              emoji="🧾"
              title={preset === 'hoje' ? 'Nenhuma venda hoje ainda' : 'Nenhuma venda neste período'}
              description="As vendas aparecem aqui assim que você concluir."
              action={
                <Button as={Link} to={ROUTES.sell} icon={ShoppingCart}>
                  Vender agora
                </Button>
              }
            />
          )}
        </Card>
      ) : (
        <div className={styles.days}>
          {groups.map(([day, daySales]) => {
            const dayActive = activeSales(daySales);
            return (
              <section key={day} aria-labelledby={`dia-${day}`} className={styles.day}>
                <h2 id={`dia-${day}`} className={styles.dayTitle}>
                  <span>{dayTitle(day)}</span>
                  <span className={styles.dayTotal}>
                    {plural(dayActive.length, 'venda')} ·{' '}
                    {formatBRL(sumCents(dayActive.map((s) => s.totalCents)))}
                  </span>
                </h2>
                <ul role="list" className={styles.list}>
                  {daySales.map((sale) => (
                    <li key={sale.id}>
                      <SaleRow sale={sale} customerName={customerNames.get(sale.customerId)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {filtered.length > limit && (
            <Button variant="secondary" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
              Mostrar mais vendas ({filtered.length - limit} restantes)
            </Button>
          )}
        </div>
      )}
    </>
  );
}
