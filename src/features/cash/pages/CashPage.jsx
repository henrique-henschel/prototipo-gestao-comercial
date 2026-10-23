import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ChevronRight,
  HandCoins,
  Lock,
  LockOpen,
  NotebookText,
  Pencil,
  Plus,
  Receipt,
  ShoppingBag,
  Trash,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { PageHeader } from '@/components/layout';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  LoadError,
  MoneyInput,
  Skeleton,
  SkeletonGroup,
  StatCard,
  StatusPill,
} from '@/components/ui';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_METHODS,
  PAYMENT_METHOD_KEYS,
  PAYMENT_METHODS,
} from '@/domain/constants.js';
import { cashDayClosing } from '@/domain/rules/cash.js';
import { formatBRL } from '@/domain/rules/money.js';
import { useCash } from '@/hooks/useCash.js';
import { useDataStatus } from '@/hooks/useData.js';
import { useSettings } from '@/hooks/useSettings.js';
import { today as todayISO } from '@/lib/date.js';
import { formatDateLong, formatDateMedium, formatTime, plural } from '@/lib/format.js';
import { PAYMENT_ICONS } from '@/features/sales/paymentIcons.js';
import { cx } from '@/lib/cx.js';
import { CloseDaySheet } from '../components/CloseDaySheet.jsx';
import { ClosingResult } from '../components/ClosingResult.jsx';
import { ExpenseSheet } from '../components/ExpenseSheet.jsx';
import { OpeningSheet } from '../components/OpeningSheet.jsx';
import { useCashActions } from '../useCashActions.js';
import styles from './CashPage.module.css';

/** Quantos dias anteriores aparecem de cada vez. */
const HISTORY_STEP = 7;

/** Dia pedido na barra de endereço (`?dia=AAAA-MM-DD`); fora disso, hoje. */
function dayFromParams(params, today) {
  const value = params.get('dia');
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value < today ? value : today;
}

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Caixa do dia (seção 6 das regras): abrir com troco inicial, o que entrou por forma de
 * pagamento (o fiado à parte, como "vendido a receber"), despesas com "Desfazer", o
 * dinheiro que deve ter na gaveta explicado em linguagem simples, fechar o dia com a
 * contagem ("sobrou" ou "faltou"), reabrir e consultar dias anteriores (`?dia=`).
 */
export default function CashPage() {
  const [params] = useSearchParams();
  const today = todayISO();
  const date = dayFromParams(params, today);
  const { status, reload } = useDataStatus();
  const { isToday, cashDay, summary, dayExpenses, history } = useCash(date);
  const actions = useCashActions(date);
  const [sheet, setSheet] = useState(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [historyCount, setHistoryCount] = useState(HISTORY_STEP);

  const closed = Boolean(cashDay?.closedAt);
  const closing = cashDayClosing(cashDay);
  const canAddExpense = isToday && !closed;
  const hasActivity = summary.salesCount > 0 || summary.fiadoReceivedCents > 0 || dayExpenses.length > 0;

  const openSheet = (name) => {
    setSheetKey((key) => key + 1);
    setSheet(name);
  };
  const closeSheet = () => setSheet(null);
  const doneThen = (promise) => promise.then((ok) => ok && closeSheet());

  const header = (
    <PageHeader
      title={isToday ? 'Caixa do dia' : `Caixa de ${formatDateMedium(date)}`}
      description={
        isToday
          ? `${capitalize(formatDateLong(date))}. Quanto entrou, quanto saiu e quanto tem na gaveta.`
          : capitalize(formatDateLong(date))
      }
      backTo={isToday ? undefined : ROUTES.cash}
      backLabel="Voltar para hoje"
    />
  );

  if (status === 'loading') {
    return (
      <>
        {header}
        <SkeletonGroup label="Carregando o caixa" className={styles.loading}>
          <div className={styles.stats}>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} shape="rect" height="6rem" />
            ))}
          </div>
          <Skeleton shape="rect" height="16rem" />
          <Skeleton shape="rect" height="10rem" />
        </SkeletonGroup>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        {header}
        <LoadError title="Não deu para carregar o caixa" onRetry={reload} />
      </>
    );
  }

  if (!isToday && !cashDay && !hasActivity) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            emoji="🗓️"
            title="Nesse dia o caixa não foi aberto"
            description="Não teve venda, despesa nem fiado recebido nesse dia."
            action={
              <Button as={Link} to={ROUTES.cash} variant="secondary" icon={Wallet}>
                Ver o caixa de hoje
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

      <div className={styles.status}>
        {closed ? (
          <StatusPill tone="neutral" icon={Lock}>
            Dia fechado às {formatTime(cashDay.closedAt)}
          </StatusPill>
        ) : cashDay ? (
          <StatusPill tone="success" icon={LockOpen}>
            Caixa aberto desde {formatTime(cashDay.openedAt)}
          </StatusPill>
        ) : (
          <StatusPill tone="warning" icon={Lock}>
            Caixa ainda não aberto
          </StatusPill>
        )}
      </div>

      <section aria-label="Resumo do dia" className={styles.stats}>
        <StatCard
          label="Vendido"
          value={formatBRL(summary.soldCents)}
          icon={ShoppingBag}
          hint={plural(summary.salesCount, 'venda')}
        />
        <StatCard
          label="Entrou"
          value={formatBRL(summary.receivedCents)}
          icon={HandCoins}
          tone="success"
          hint="Sem o fiado, com o fiado recebido"
        />
        <StatCard
          label="Vendido fiado"
          value={formatBRL(summary.fiadoSoldCents)}
          icon={NotebookText}
          tone="accent"
          hint="Para receber depois"
        />
        <StatCard
          label="Despesas"
          value={formatBRL(summary.expensesCents)}
          icon={Receipt}
          tone="info"
          hint={plural(dayExpenses.length, 'despesa')}
        />
      </section>

      <div className={styles.layout}>
        <div className={styles.column}>
          {isToday && !cashDay ? (
            <OpenCashCard loading={actions.saving === 'open'} onOpen={actions.open} />
          ) : (
            <Card className={styles.card}>
              <CardHeader
                title={closed ? 'Conferência da gaveta' : 'Dinheiro na gaveta'}
                icon={Wallet}
                headingLevel="h2"
              />

              {closed ? (
                <div className={styles.drawer}>
                  <p className={styles.drawerLabel}>Você contou</p>
                  <p className={styles.drawerValue}>{formatBRL(closing.countedCents)}</p>
                  <ClosingResult result={closing.result} differenceCents={closing.differenceCents} />
                  {cashDay.note && <p className={styles.muted}>“{cashDay.note}”</p>}
                </div>
              ) : (
                <div className={styles.drawer}>
                  <p className={styles.drawerLabel}>Deve ter na gaveta agora</p>
                  <p className={styles.drawerValue} aria-live="polite">
                    {formatBRL(summary.expectedCashCents)}
                  </p>
                  <p className={styles.muted}>
                    É o troco do começo do dia, mais o dinheiro que entrou, menos o que saiu da gaveta. Pix e
                    cartão vão para o banco e não contam aqui.
                  </p>
                </div>
              )}

              <dl className={styles.breakdown} aria-label="Como a conta da gaveta é feita">
                <div>
                  <dt>Troco inicial</dt>
                  <dd>
                    {formatBRL(summary.openingCents)}
                    {!closed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Pencil}
                        onClick={() => openSheet('opening')}
                        className={styles.inline}
                      >
                        Mudar<span className="visually-hidden"> o troco inicial</span>
                      </Button>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>+ Vendas em dinheiro (já sem o troco)</dt>
                  <dd>{formatBRL(summary.salesByMethod.dinheiro)}</dd>
                </div>
                <div>
                  <dt>+ Fiado recebido em dinheiro</dt>
                  <dd>{formatBRL(summary.fiadoReceivedByMethod.dinheiro)}</dd>
                </div>
                <div>
                  <dt>− Despesas pagas com o dinheiro da gaveta</dt>
                  <dd>{formatBRL(summary.cashExpensesCents)}</dd>
                </div>
                <div className={styles.total}>
                  <dt>= Deve ter na gaveta</dt>
                  <dd>{formatBRL(closed ? closing.expectedCents : summary.expectedCashCents)}</dd>
                </div>
              </dl>

              {closed && closing.expectedCents !== summary.expectedCashCents && (
                <p className={styles.warning} role="note">
                  Depois de fechar, o dinheiro esperado mudou para {formatBRL(summary.expectedCashCents)}.
                  Reabra o dia para conferir de novo.
                </p>
              )}

              {closed ? (
                <Button
                  variant="secondary"
                  icon={LockOpen}
                  loading={actions.saving === 'reopen'}
                  onClick={actions.reopen}
                  className={styles.start}
                >
                  Reabrir o dia
                </Button>
              ) : (
                <Button size="hero" icon={Lock} fullWidth onClick={() => openSheet('close')}>
                  Fechar o dia
                </Button>
              )}
            </Card>
          )}

          <EntriesCard summary={summary} />
        </div>

        <div className={styles.column}>
          <Card className={styles.card}>
            <CardHeader
              title="Despesas"
              icon={Receipt}
              headingLevel="h2"
              description={
                closed ? 'Dia fechado: para mudar as despesas, reabra o dia.' : 'Gastos do negócio neste dia.'
              }
            />
            {canAddExpense && (
              <Button
                variant="secondary"
                icon={Plus}
                onClick={() => openSheet('expense')}
                className={styles.start}
              >
                Lançar despesa
              </Button>
            )}
            {dayExpenses.length === 0 ? (
              <p className={styles.muted}>
                {canAddExpense
                  ? 'Nenhuma despesa hoje. Lance gasolina, gelo, aluguel do ponto e outros gastos.'
                  : 'Nenhuma despesa neste dia.'}
              </p>
            ) : (
              <ul role="list" className={styles.rows} aria-label="Despesas do dia">
                {dayExpenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    canDelete={!closed}
                    loading={actions.saving === `remove-${expense.id}`}
                    onDelete={() => actions.removeExpense(expense)}
                  />
                ))}
              </ul>
            )}
          </Card>

          {history.length > 0 && (
            <Card className={styles.card}>
              <CardHeader title="Dias anteriores" icon={Wallet} headingLevel="h2" />
              <ul role="list" className={styles.rows} aria-label="Dias anteriores">
                {history.slice(0, historyCount).map((row) => (
                  <li key={row.cashDay.date}>
                    <Link to={`${ROUTES.cash}?dia=${row.cashDay.date}`} className={styles.dayLink}>
                      <span className={styles.rowText}>
                        <span className={styles.rowTitle}>
                          {capitalize(formatDateMedium(row.cashDay.date))}
                        </span>
                        <span className={styles.rowMeta}>Vendeu {formatBRL(row.soldCents)}</span>
                        {row.closing ? (
                          <ClosingResult
                            result={row.closing.result}
                            differenceCents={row.closing.differenceCents}
                            size="sm"
                          />
                        ) : (
                          <span className={styles.rowMeta}>Não foi fechado</span>
                        )}
                      </span>
                      <ChevronRight size={22} aria-hidden="true" className={styles.chevron} />
                    </Link>
                  </li>
                ))}
              </ul>
              {history.length > historyCount && (
                <Button
                  variant="ghost"
                  onClick={() => setHistoryCount((count) => count + HISTORY_STEP)}
                  className={styles.start}
                >
                  Ver mais dias
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      <ExpenseSheet
        key={`expense-${sheetKey}`}
        open={sheet === 'expense'}
        onClose={closeSheet}
        loading={actions.saving === 'expense'}
        onConfirm={(input) => doneThen(actions.addExpense(input))}
      />
      <CloseDaySheet
        key={`close-${sheetKey}`}
        open={sheet === 'close'}
        onClose={closeSheet}
        expectedCents={summary.expectedCashCents}
        loading={actions.saving === 'close'}
        onConfirm={(input) => doneThen(actions.close(input))}
      />
      <OpeningSheet
        key={`opening-${sheetKey}`}
        open={sheet === 'opening'}
        onClose={closeSheet}
        openingCents={summary.openingCents}
        loading={actions.saving === 'opening'}
        onConfirm={(value) => doneThen(actions.changeOpening(value))}
      />
    </>
  );
}

/** Abrir o caixa de hoje com o troco inicial (regra 6.1); o padrão vem dos Ajustes. */
function OpenCashCard({ loading, onOpen }) {
  const { settings } = useSettings();
  const [openingCents, setOpeningCents] = useState(settings.defaultOpeningCents ?? 0);

  return (
    <Card className={styles.card}>
      <CardHeader
        title="Abrir o caixa"
        icon={Wallet}
        headingLevel="h2"
        description="Ele também abre sozinho na primeira venda do dia."
      />
      <MoneyInput
        label="Quanto tem de troco na gaveta?"
        optional
        value={openingCents}
        onChange={setOpeningCents}
        keypad
        hint="Se começou sem troco, deixe R$ 0,00."
      />
      <Button size="hero" icon={LockOpen} fullWidth loading={loading} onClick={() => onOpen(openingCents)}>
        Abrir o caixa
      </Button>
    </Card>
  );
}

/** O que entrou no dia por forma de pagamento, com o fiado à parte (regra 6.2). */
function EntriesCard({ summary }) {
  const methods = PAYMENT_METHOD_KEYS.filter((method) => method !== 'fiado');
  const fiadoReceived = methods.filter((method) => summary.fiadoReceivedByMethod[method] > 0);

  return (
    <Card className={styles.card}>
      <CardHeader title="O que entrou" icon={HandCoins} headingLevel="h2" />

      <h3 className={styles.subheading}>Vendas</h3>
      <ul role="list" className={styles.rows} aria-label="Vendas por forma de pagamento">
        {methods.map((method) => (
          <MethodRow key={method} method={method} cents={summary.salesByMethod[method]} />
        ))}
      </ul>
      <div className={styles.fiadoSold}>
        <MethodRow as="div" method="fiado" label="Vendido fiado (a receber)" cents={summary.fiadoSoldCents} />
        <p className={styles.muted}>Não entrou dinheiro: o cliente paga depois.</p>
      </div>

      <h3 className={styles.subheading}>Fiado recebido</h3>
      {fiadoReceived.length === 0 ? (
        <p className={styles.muted}>Ninguém pagou fiado neste dia.</p>
      ) : (
        <ul role="list" className={styles.rows} aria-label="Fiado recebido por forma de pagamento">
          {fiadoReceived.map((method) => (
            <MethodRow key={method} method={method} cents={summary.fiadoReceivedByMethod[method]} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function MethodRow({ method, cents, label, as: Component = 'li' }) {
  const Icon = PAYMENT_ICONS[method];
  return (
    <Component className={styles.methodRow}>
      <Icon size={22} aria-hidden="true" className={styles.methodIcon} />
      <span className={styles.methodLabel}>{label ?? PAYMENT_METHODS[method].label}</span>
      <span className={styles.value}>{formatBRL(cents)}</span>
    </Component>
  );
}

function ExpenseRow({ expense, canDelete, loading, onDelete }) {
  const category = EXPENSE_CATEGORIES.find((option) => option.value === expense.category);
  const method = EXPENSE_METHODS.find((option) => option.value === expense.method);
  return (
    <li className={cx(styles.row, 'enter')}>
      <span className={styles.emoji} aria-hidden="true">
        {category?.emoji}
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{expense.description}</span>
        <span className={styles.rowMeta}>
          {category?.label} · {expense.method === 'dinheiro' ? 'Dinheiro da gaveta' : 'Outra forma'} ·{' '}
          {formatTime(expense.createdAt)}
        </span>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            icon={Trash}
            loading={loading}
            onClick={onDelete}
            className={styles.inline}
          >
            Apagar<span className="visually-hidden"> a despesa {expense.description}</span>
          </Button>
        )}
      </span>
      <span className={styles.value}>
        −{formatBRL(expense.amountCents)}
        <span className="visually-hidden"> ({method?.label})</span>
      </span>
    </li>
  );
}
