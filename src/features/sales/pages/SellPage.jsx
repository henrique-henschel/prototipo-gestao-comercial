import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, Pencil } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { PageHeader } from '@/components/layout';
import { BottomSheet, Button, Card, LoadError, Skeleton, SkeletonGroup } from '@/components/ui';
import { UNDO_WINDOW_MS, UNITS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { topProducts } from '@/domain/rules/metrics.js';
import { findStockShortages } from '@/domain/rules/stock.js';
import { useCart } from '@/hooks/useCart.js';
import { useCustomers } from '@/hooks/useCustomers.js';
import { useDataStatus } from '@/hooks/useData.js';
import { useMediaQuery } from '@/hooks/useMediaQuery.js';
import { useProducts } from '@/hooks/useProducts.js';
import { useSales } from '@/hooks/useSales.js';
import { useSettings } from '@/hooks/useSettings.js';
import { useToast } from '@/hooks/useToast.js';
import { useVibrate, VIBRATION } from '@/hooks/useVibrate.js';
import { addDays, today } from '@/lib/date.js';
import { formatNumber } from '@/lib/format.js';
import { toSaleItems, tapQuantity } from '@/store/cart-reducer.js';
import { CartBar } from '../components/CartBar.jsx';
import { CartPanel } from '../components/CartPanel.jsx';
import { CustomAmountSheet } from '../components/CustomAmountSheet.jsx';
import { PaymentPanel } from '../components/PaymentPanel.jsx';
import { ProductPicker } from '../components/ProductPicker.jsx';
import { SaleCompleted } from '../components/SaleCompleted.jsx';
import { StockWarningDialog } from '../components/StockWarningDialog.jsx';
import styles from './SellPage.module.css';

/** Etapas da venda na barra de endereço: o "voltar" do celular volta uma etapa. */
const STEP_PARAM = 'etapa';
const PAYMENT_STEP = 'pagamento';
const SALE_PARAM = 'venda';

/** Duas colunas (produtos | carrinho) só quando sobra espaço ao lado da barra lateral. */
const WIDE_QUERY = '(width >= 64rem)';

/** Janela dos "mais vendidos", que aparecem primeiro na grade. */
const POPULAR_DAYS = 30;

/**
 * PDV: escolher produtos, cobrar e concluir a venda (Fase 5).
 * - Sem parâmetros: produtos + carrinho (no celular, a barra do carrinho fica embaixo).
 * - `?etapa=pagamento`: formas de pagamento.
 * - `?venda=<id>`: venda concluída, com "Nova venda" e "Desfazer".
 */
export default function SellPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const wide = useMediaQuery(WIDE_QUERY);
  const toast = useToast();
  const vibrate = useVibrate();

  const { status, reload } = useDataStatus();
  const { products, activeProducts } = useProducts();
  const { sales, createSale, undoSale } = useSales();
  const { customers } = useCustomers();
  const { settings, business } = useSettings();
  const { cart, lines, totals, itemCount, isEmpty, actions } = useCart();

  const [cartOpen, setCartOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customKey, setCustomKey] = useState(0);
  const [shortages, setShortages] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [justSold, setJustSold] = useState(null);

  // Os mais vendidos dos últimos 30 dias primeiro; o resto em ordem alfabética.
  const orderedProducts = useMemo(() => {
    const end = today();
    const period = { start: addDays(end, -(POPULAR_DAYS - 1)), end };
    const rank = new Map(
      topProducts(sales, period, Infinity).map((entry, index) => [entry.productId, index]),
    );
    return [...activeProducts].sort(
      (a, b) =>
        (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) || a.name.localeCompare(b.name, 'pt-BR'),
    );
  }, [activeProducts, sales]);

  const quantities = useMemo(
    () => new Map(lines.filter((line) => line.productId).map((line) => [line.productId, line.quantity])),
    [lines],
  );

  if (status === 'loading') return <SellSkeleton />;
  if (status === 'error') {
    return (
      <>
        <PageHeader title="Vender" />
        <LoadError title="Não deu para carregar os produtos" onRetry={reload} />
      </>
    );
  }

  const step = params.get(STEP_PARAM);
  const saleId = params.get(SALE_PARAM) ?? (step === PAYMENT_STEP ? justSold : null);

  /* ---------- Ações ---------- */

  const addProduct = (product) => {
    actions.addProduct(product.id, tapQuantity(product.unit));
    vibrate(VIBRATION.tap);
  };

  const goToPayment = () => {
    setJustSold(null);
    setShortages(null);
    setCartOpen(false);
    setParams({ [STEP_PARAM]: PAYMENT_STEP });
  };

  const checkout = () => {
    const found = findStockShortages(toSaleItems(lines), products);
    if (found.length > 0) setShortages(found);
    else goToPayment();
  };

  const undo = async (id, snapshot) => {
    try {
      await undoSale(id);
      actions.restore(snapshot);
      toast.show({
        message: 'Venda desfeita',
        description: 'Os produtos voltaram para o carrinho.',
        tone: 'info',
      });
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
    }
  };

  const submit = async (payments) => {
    const snapshot = cart;
    setSubmitting(true);
    try {
      const { sale } = await createSale({
        items: toSaleItems(lines),
        discount: cart.discount,
        payments,
        customerId: cart.customerId,
        note: cart.note,
        allowZeroTotal: totals.totalCents === 0,
      });
      vibrate(VIBRATION.success);
      // O roteador navega numa transição, que o React pode aplicar depois de esvaziar o
      // carrinho: `justSold` mostra a venda concluída mesmo antes de a URL mudar.
      setJustSold(sale.id);
      actions.clear();
      setParams({ [SALE_PARAM]: sale.id }, { replace: true });
      toast.show({
        message: 'Venda registrada',
        description: `Venda nº ${sale.number}, ${formatBRL(sale.totalCents)}`,
        action: { label: 'Desfazer', onClick: () => undo(sale.id, snapshot) },
        duration: UNDO_WINDOW_MS,
      });
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Venda concluída ---------- */

  if (saleId) {
    const sale = sales.find((s) => s.id === saleId);
    // Desfeita (ou inexistente): volta para os produtos, onde a venda reaparece no carrinho.
    if (!sale) return <Navigate to={ROUTES.sell} replace />;
    return (
      <SaleCompleted
        key={sale.id}
        sale={sale}
        customer={customers.find((c) => c.id === sale.customerId) ?? null}
        businessName={business?.name}
        onNewSale={() => navigate(ROUTES.sell, { replace: true })}
      />
    );
  }

  /* ---------- Pagamento ---------- */

  if (step === PAYMENT_STEP) {
    if (isEmpty) return <Navigate to={ROUTES.sell} replace />;
    return (
      <>
        <PageHeader title="Cobrar" backTo={ROUTES.sell} backLabel="Voltar aos produtos" />
        <div className={wide ? styles.columns : undefined}>
          <PaymentPanel
            totalCents={totals.totalCents}
            itemCount={itemCount}
            customerId={cart.customerId}
            onCustomerChange={actions.setCustomer}
            settings={settings}
            business={business}
            submitting={submitting}
            onConfirm={submit}
          />
          {wide && (
            <aside className={styles.aside} aria-labelledby="resumo-venda">
              <OrderSummary lines={lines} totals={totals} />
            </aside>
          )}
        </div>
      </>
    );
  }

  /* ---------- Produtos e carrinho ---------- */

  const openCustom = () => {
    setCustomKey((key) => key + 1);
    setCustomOpen(true);
  };

  const checkoutButton = (
    <Button size="hero" fullWidth iconRight={ArrowRight} onClick={checkout} disabled={isEmpty}>
      Cobrar {formatBRL(totals.totalCents)}
    </Button>
  );

  return (
    <div className={!wide && !isEmpty ? styles.withBar : undefined}>
      <PageHeader title="Vender" description="Toque nos produtos para montar a venda." />
      <div className={wide ? styles.columns : undefined}>
        <ProductPicker
          products={orderedProducts}
          quantities={quantities}
          onAdd={addProduct}
          onCustomAmount={openCustom}
        />
        {wide && (
          <aside className={styles.aside} aria-labelledby="carrinho-titulo">
            <Card className={styles.cartCard}>
              <h2 id="carrinho-titulo" className={styles.asideTitle}>
                Carrinho
              </h2>
              <CartPanel />
              {!isEmpty && checkoutButton}
            </Card>
          </aside>
        )}
      </div>

      {!wide && !isEmpty && (
        <CartBar
          itemCount={itemCount}
          totalCents={totals.totalCents}
          onOpenCart={() => setCartOpen(true)}
          onCheckout={checkout}
        />
      )}
      {!wide && (
        <BottomSheet
          open={cartOpen && !isEmpty}
          onClose={() => setCartOpen(false)}
          title="Carrinho"
          footer={checkoutButton}
        >
          <CartPanel />
        </BottomSheet>
      )}

      <CustomAmountSheet
        key={customKey}
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onAdd={(input) => {
          actions.addCustom(input);
          vibrate(VIBRATION.tap);
          setCustomOpen(false);
        }}
      />
      <StockWarningDialog
        open={Boolean(shortages)}
        shortages={shortages ?? []}
        blocked={settings.blockSaleWithoutStock}
        onClose={() => setShortages(null)}
        onContinue={goToPayment}
      />
    </div>
  );
}

/** Resumo só de leitura da venda, ao lado do pagamento no computador. */
function OrderSummary({ lines, totals }) {
  return (
    <Card className={styles.cartCard}>
      <h2 id="resumo-venda" className={styles.asideTitle}>
        O que está sendo vendido
      </h2>
      <ul role="list" className={styles.summary}>
        {lines.map((line) => (
          <li key={line.key} className={styles.summaryLine}>
            <span aria-hidden="true">{line.emoji ?? '🧮'}</span>
            <span className={styles.summaryName}>
              {line.productId && `${formatNumber(line.quantity)} ${UNITS[line.unit]?.short ?? ''} `}
              {line.name}
            </span>
            <span className={styles.summaryValue}>{formatBRL(line.totalCents)}</span>
          </li>
        ))}
      </ul>
      {totals.discountCents > 0 && (
        <p className={styles.summaryDiscount}>Desconto: {formatBRL(-totals.discountCents)}</p>
      )}
      <Button as={Link} to={ROUTES.sell} variant="secondary" icon={Pencil}>
        Mudar os itens
      </Button>
    </Card>
  );
}

/** Carregando: o formato da grade de produtos. */
function SellSkeleton() {
  return (
    <SkeletonGroup label="Carregando os produtos">
      <PageHeader title="Vender" description="Toque nos produtos para montar a venda." />
      <div className={styles.skeletonGrid}>
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} shape="rect" height="10rem" />
        ))}
      </div>
    </SkeletonGroup>
  );
}
