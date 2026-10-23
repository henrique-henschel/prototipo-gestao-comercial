import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import {
  ChartColumn,
  ChevronRight,
  CircleCheck,
  HandCoins,
  PackagePlus,
  Receipt,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { ChartCard, ColumnChart, DonutChart, RankedBars } from '@/components/charts';
import { PageHeader } from '@/components/layout';
import {
  Button,
  Card,
  CardHeader,
  Chip,
  ChipGroup,
  EmptyState,
  Skeleton,
  StatCard,
  StatusPill,
} from '@/components/ui';
import { PAYMENT_METHODS, UNITS } from '@/domain/constants.js';
import { formatBRL, sumCents } from '@/domain/rules/money.js';
import { useDataStatus } from '@/hooks/useData.js';
import { useSession } from '@/hooks/useSession.js';
import { today as todayISO } from '@/lib/date.js';
import {
  formatDateMedium,
  formatDayOfMonth,
  formatPercent,
  formatQuantity,
  formatWeekdayShort,
  plural,
} from '@/lib/format.js';
import { Tour } from '@/features/help/components/Tour.jsx';
import { PAYMENT_ICONS } from '@/features/sales/paymentIcons.js';
import { DASHBOARD_PERIODS, DEFAULT_DASHBOARD_PERIOD, deltaOf } from '../periods.js';
import { useDashboard } from '../useDashboard.js';
import styles from './HomePage.module.css';

const SHORTCUTS = [
  { to: ROUTES.fiado, label: 'Receber fiado', icon: Wallet },
  { to: ROUTES.cash, label: 'Caixa e despesas', icon: Receipt },
  { to: ROUTES.inventory, label: 'Chegou mercadoria', icon: PackagePlus },
  { to: ROUTES.sales, label: 'Ver vendas', icon: ShoppingBag },
  { to: ROUTES.customers, label: 'Clientes', icon: Users },
  { to: ROUTES.reports, label: 'Relatórios', icon: ChartColumn },
];

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Início: "Hoje você vendeu R$ X" em destaque com "Vender" (a ação principal), o que
 * precisa de atenção (fiado e estoque, com links), indicadores do período com a comparação
 * ao período anterior, vendas por dia, rosca por forma de pagamento, mais vendidos e
 * atalhos. O período fica na barra de endereço (`?periodo=`) e vale para tudo abaixo dele.
 * Com `state.tour` (fim das boas-vindas ou "Ver o passo a passo de novo" na Ajuda), abre o
 * tour de primeiro uso por cima.
 */
export default function HomePage() {
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const showTour = Boolean(location.state?.tour);
  // Fechar tira o tour do histórico: o "voltar" não o abre de novo.
  const closeTour = () =>
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  const tour = showTour && <Tour open onClose={closeTour} />;
  const { status, reload } = useDataStatus();
  const presetValue = params.get('periodo');
  const periodOption =
    DASHBOARD_PERIODS.find((option) => option.value === presetValue) ??
    DASHBOARD_PERIODS.find((option) => option.value === DEFAULT_DASHBOARD_PERIOD);
  const data = useDashboard(periodOption.value);
  const firstName = user?.name.split(' ')[0];

  const header = (
    <PageHeader
      title="Início"
      description={
        firstName ? `Olá, ${firstName}! Veja como está o seu negócio.` : 'Veja como está o seu negócio.'
      }
    />
  );

  if (status === 'loading') {
    return (
      <>
        {header}
        {tour}
        <div className={styles.loading} aria-busy="true" aria-label="Carregando o início">
          <Skeleton shape="rect" height="12rem" />
          <div className={styles.stats}>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} shape="rect" height="6rem" />
            ))}
          </div>
          <Skeleton shape="rect" height="18rem" />
        </div>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        {header}
        {tour}
        <Card>
          <EmptyState
            tone="danger"
            emoji="📡"
            title="Não deu para carregar o início"
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

  const setPeriod = (value) => {
    const next = new URLSearchParams(params);
    if (value === DEFAULT_DASHBOARD_PERIOD) next.delete('periodo');
    else next.set('periodo', value);
    setParams(next, { replace: true });
  };

  return (
    <>
      {header}
      {tour}

      <div className={styles.top}>
        <TodayCard metrics={data.todayMetrics} />
        <AlertsCard alerts={data.alerts} />
      </div>

      {data.hasSales ? (
        <PeriodSection data={data} periodOption={periodOption} onPeriodChange={setPeriod} />
      ) : (
        <Card>
          <EmptyState
            emoji="🛒"
            title="Seus números aparecem aqui"
            description="Faça a primeira venda: o quanto vendeu, como os clientes pagaram e o que mais sai aparecem nesta tela."
            action={
              <Button as={Link} to={ROUTES.sell} icon={ShoppingCart} variant="secondary">
                Fazer a primeira venda
              </Button>
            }
          />
        </Card>
      )}

      <Card as="nav" aria-label="Atalhos" className={styles.card}>
        <CardHeader title="Atalhos" headingLevel="h2" />
        <ul role="list" className={styles.shortcuts}>
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.to}>
              <Button as={Link} to={shortcut.to} variant="secondary" icon={shortcut.icon} fullWidth>
                {shortcut.label}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/** "Hoje você vendeu R$ X", com "Vender" como a ação principal da tela. */
function TodayCard({ metrics }) {
  return (
    <Card className={styles.today}>
      <p className={styles.todayLabel}>Hoje você vendeu</p>
      <p className={styles.todayValue}>{formatBRL(metrics.soldCents)}</p>
      <p className={styles.muted}>
        {metrics.salesCount === 0
          ? 'Nenhuma venda ainda hoje.'
          : `${plural(metrics.salesCount, 'venda')} · entrou ${formatBRL(metrics.receivedCents)}`}
      </p>
      <Button as={Link} to={ROUTES.sell} size="hero" icon={ShoppingCart} fullWidth>
        Vender
      </Button>
    </Card>
  );
}

/** O que precisa de atenção agora, com link para a lista já filtrada. */
function AlertsCard({ alerts }) {
  const items = [
    alerts.overdueCount > 0 && {
      key: 'atrasado',
      status: 'atrasado',
      to: `${ROUTES.fiado}?situacao=atrasados`,
      text: `${plural(alerts.overdueCount, 'cliente')} com fiado atrasado`,
      amountCents: alerts.overdueCents,
    },
    alerts.dueSoonCount > 0 && {
      key: 'vence',
      status: 'vence_em_breve',
      to: `${ROUTES.fiado}?situacao=logo`,
      text: `${plural(alerts.dueSoonCount, 'cliente')} para pagar nos próximos dias`,
      amountCents: alerts.dueSoonCents,
    },
    alerts.outCount > 0 && {
      key: 'acabou',
      status: 'acabou',
      to: `${ROUTES.inventory}?situacao=acabou`,
      text: `${plural(alerts.outCount, 'produto acabou', 'produtos acabaram')}`,
    },
    alerts.lowCount > 0 && {
      key: 'acabando',
      status: 'acabando',
      to: `${ROUTES.inventory}?situacao=acabando`,
      text: `${plural(alerts.lowCount, 'produto acabando', 'produtos acabando')}`,
    },
  ].filter(Boolean);

  return (
    <Card as="section" aria-labelledby="avisos" className={styles.card}>
      <h2 id="avisos" className={styles.cardTitle}>
        Precisa de atenção
      </h2>
      {items.length === 0 ? (
        <p className={styles.allGood}>
          <CircleCheck size={22} aria-hidden="true" />
          Tudo em dia: ninguém atrasado e nada acabando.
        </p>
      ) : (
        <ul role="list" className={styles.alerts}>
          {items.map((item) => (
            <li key={item.key}>
              <Link to={item.to} className={styles.alert}>
                <StatusPill status={item.status} />
                <span className={styles.alertText}>
                  {item.text}
                  {item.amountCents !== undefined && (
                    <>
                      : <span className={styles.nowrap}>{formatBRL(item.amountCents)}</span>
                    </>
                  )}
                </span>
                <ChevronRight size={22} aria-hidden="true" className={styles.chevron} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Tudo o que depende do período escolhido: indicadores e gráficos. */
function PeriodSection({ data, periodOption, onPeriodChange }) {
  const { comparison, period, series, mix, top } = data;
  const { current } = comparison;
  const periodLabel = periodOption.label.toLowerCase();
  const isMonth = periodOption.value === 'este_mes';
  const today = todayISO();

  const seriesData = series.map((day) => ({
    key: day.date,
    label: day.date === today ? 'hoje' : isMonth ? formatDayOfMonth(day.date) : formatWeekdayShort(day.date),
    title: `${capitalize(formatDateMedium(day.date))}${day.date === today ? ' (até agora)' : ''}`,
    value: day.soldCents,
    salesCount: day.salesCount,
  }));
  const seriesTotal = sumCents(seriesData.map((day) => day.value));
  const best = seriesData.reduce((top, day) => (day.value > top.value ? day : top), seriesData[0]);

  const mixData = mix.map((row) => ({
    key: row.method,
    label: PAYMENT_METHODS[row.method].label,
    value: row.amountCents,
    share: row.share,
    color: `var(--chart-${PAYMENT_METHODS[row.method].chartSlot})`,
    icon: PAYMENT_ICONS[row.method],
  }));
  const mostUsed = mixData.reduce((top, row) => (row.value > top.value ? row : top), mixData[0]);

  return (
    <section aria-labelledby="periodo" className={styles.period}>
      <h2 id="periodo" className="visually-hidden">
        Números do período
      </h2>
      <ChipGroup label="Ver os números de" wrap>
        {DASHBOARD_PERIODS.map((option) => (
          <Chip
            key={option.value}
            selected={option.value === periodOption.value}
            onClick={() => onPeriodChange(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </ChipGroup>

      <p className={styles.muted} aria-live="polite">
        Comparando com {periodOption.against(period)}.
      </p>

      <div className={styles.stats}>
        <StatCard
          label="Vendido"
          value={formatBRL(current.soldCents)}
          icon={ShoppingBag}
          delta={deltaOf(comparison.sold)}
        />
        <StatCard
          label="Recebido"
          value={formatBRL(current.receivedCents)}
          icon={HandCoins}
          tone="success"
          delta={deltaOf(comparison.received)}
          hint="Sem o fiado, com o fiado recebido"
        />
        <StatCard
          label="Lucro estimado"
          value={formatBRL(current.profitCents)}
          icon={TrendingUp}
          tone={current.profitCents < 0 ? 'danger' : 'accent'}
          delta={deltaOf(comparison.profit)}
          hint={
            current.hasMissingCost
              ? 'Tem produto sem custo: o lucro pode ser menor'
              : 'Vendido menos custos, taxas e despesas'
          }
        />
        <StatCard
          label="Média por venda"
          value={formatBRL(current.averageTicketCents)}
          icon={Receipt}
          tone="info"
          delta={deltaOf(comparison.averageTicket)}
          hint={plural(current.salesCount, 'venda')}
        />
      </div>

      <div className={styles.charts}>
        <ChartCard
          className={styles.wide}
          title={
            isMonth ? 'Quanto você vendeu em cada dia deste mês' : 'Quanto você vendeu nos últimos 7 dias'
          }
          summary={
            <p>
              Total: <strong>{formatBRL(seriesTotal)}</strong>
              {best.value > 0 && (
                <>
                  {' '}
                  · melhor dia: {best.title.replace(' (até agora)', '')}, {formatBRL(best.value)}
                </>
              )}
            </p>
          }
          table={{
            caption: 'Vendido em cada dia',
            columns: [
              { key: 'day', label: 'Dia' },
              { key: 'sold', label: 'Vendido', numeric: true },
              { key: 'count', label: 'Vendas', numeric: true },
            ],
            rows: seriesData.map((day) => ({
              key: day.key,
              day: day.title,
              sold: formatBRL(day.value),
              count: day.salesCount,
            })),
          }}
        >
          <ColumnChart
            data={seriesData}
            seriesName="Vendido"
            formatValue={(value) => formatBRL(value)}
            formatTick={(value) => formatBRL(value, { compact: true })}
          />
        </ChartCard>

        <ChartCard
          title={`Como os clientes pagaram (${periodLabel})`}
          summary={
            mostUsed.value > 0 ? (
              <p>
                Mais usado: <strong>{mostUsed.label}</strong>, {formatPercent(mostUsed.share)} do vendido
              </p>
            ) : undefined
          }
          table={
            mostUsed.value > 0
              ? {
                  caption: 'Vendido por forma de pagamento',
                  columns: [
                    { key: 'method', label: 'Forma' },
                    { key: 'value', label: 'Valor', numeric: true },
                    { key: 'share', label: 'Parte', numeric: true },
                  ],
                  rows: mixData.map((row) => ({
                    key: row.key,
                    method: row.label,
                    value: formatBRL(row.value),
                    share: formatPercent(row.share),
                  })),
                }
              : undefined
          }
        >
          {mostUsed.value > 0 ? (
            <DonutChart
              data={mixData}
              formatValue={(value) => formatBRL(value)}
              totalLabel="Vendido"
              legendLabel="Vendido por forma de pagamento"
            />
          ) : (
            <p className={styles.muted}>
              Nenhuma venda {periodOption.value === 'hoje' ? 'hoje ainda' : 'no período'}.
            </p>
          )}
        </ChartCard>

        <ChartCard
          title={`Mais vendidos (${periodLabel})`}
          summary={
            top.length > 0 ? (
              <p>
                O que mais vendeu: <strong>{top[0].name}</strong>
              </p>
            ) : undefined
          }
        >
          {top.length > 0 ? (
            <RankedBars
              label="Produtos que mais venderam, pelo valor"
              items={top.map((product) => ({
                key: product.productId,
                label: product.name,
                emoji: product.emoji,
                value: product.revenueCents,
                detail: `${formatQuantity(product.quantity, UNITS[product.unit]?.short ?? product.unit)} ${product.quantity === 1 ? 'vendido' : 'vendidos'}`,
              }))}
              formatValue={(value) => formatBRL(value)}
            />
          ) : (
            <p className={styles.muted}>
              Nenhum produto vendido {periodOption.value === 'hoje' ? 'hoje ainda' : 'no período'}.
            </p>
          )}
        </ChartCard>
      </div>
    </section>
  );
}
