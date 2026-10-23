import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Package } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { PageHeader } from '@/components/layout';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  LoadError,
  Skeleton,
  SkeletonGroup,
  StatusPill,
} from '@/components/ui';
import { UNITS } from '@/domain/constants.js';
import { stockStatus } from '@/domain/rules/stock.js';
import { useDataStatus } from '@/hooks/useData.js';
import { useProducts } from '@/hooks/useProducts.js';
import { useSales } from '@/hooks/useSales.js';
import { useToast } from '@/hooks/useToast.js';
import { formatQuantity } from '@/lib/format.js';
import { MovementHistory } from '../components/MovementHistory.jsx';
import { ProductForm } from '../components/ProductForm.jsx';
import { StockMovementSheet } from '../components/StockMovementSheet.jsx';
import { MANUAL_MOVEMENTS, MOVEMENT_UI } from '../movements.js';
import { useStockMovement } from '../useStockMovement.js';
import styles from './ProductFormPage.module.css';

/**
 * Produto novo (`/estoque/novo`) ou edição (`/estoque/:productId`): o formulário com a
 * prévia do card e, na edição, quanto tem agora, entrada de mercadoria, contagem, perda
 * com motivo (todas com "Desfazer") e o histórico de movimentações.
 */
export default function ProductFormPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { status, reload } = useDataStatus();
  const { products, stockMovements, createProduct, updateProduct } = useProducts();
  const { sales } = useSales();
  const toast = useToast();
  const movement = useStockMovement();
  const [saving, setSaving] = useState(false);
  const [sheetType, setSheetType] = useState('entrada');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);

  const isNew = !productId;
  const product = isNew ? null : products.find((p) => p.id === productId);
  const movements = useMemo(
    () => stockMovements.filter((m) => m.productId === productId),
    [stockMovements, productId],
  );
  const saleNumbers = useMemo(() => new Map(sales.map((sale) => [sale.id, sale.number])), [sales]);

  const title = isNew ? 'Produto novo' : (product?.name ?? 'Produto');
  const header = (
    <PageHeader
      title={title}
      description={isNew ? 'Só nome, categoria e preço são obrigatórios.' : undefined}
      backTo={ROUTES.inventory}
      backLabel="Voltar ao estoque"
    />
  );

  if (status === 'loading') {
    return (
      <>
        {header}
        <SkeletonGroup label="Carregando o produto" className={styles.loading}>
          <Skeleton shape="rect" height="8rem" />
          <Skeleton shape="rect" height="20rem" />
        </SkeletonGroup>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        {header}
        <LoadError title="Não deu para carregar o produto" onRetry={reload} />
      </>
    );
  }

  if (!isNew && !product) {
    return (
      <>
        <PageHeader title="Produto não encontrado" backTo={ROUTES.inventory} backLabel="Voltar ao estoque" />
        <Card>
          <EmptyState
            emoji="🔎"
            title="Não encontramos esse produto"
            action={
              <Button as={Link} to={ROUTES.inventory} icon={Package}>
                Ver o estoque
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const submit = async (input) => {
    setSaving(true);
    try {
      if (isNew) {
        const { product: created } = await createProduct(input);
        toast.show({ message: 'Produto cadastrado', description: created.name, tone: 'success' });
      } else {
        await updateProduct(product.id, input);
        toast.show({ message: 'Produto salvo', description: input.name.trim(), tone: 'success' });
      }
      navigate(ROUTES.inventory);
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
      setSaving(false);
    }
  };

  const openSheet = (type) => {
    setSheetType(type);
    setSheetKey((key) => key + 1);
    setSheetOpen(true);
  };

  const unitShort = product ? (UNITS[product.unit]?.short ?? product.unit) : '';
  const situation = product ? stockStatus(product) : null;

  return (
    <>
      {header}

      {product?.trackStock && (
        <Card className={styles.stock}>
          <div className={styles.stockNow}>
            <p className={styles.stockLabel}>Tem agora</p>
            <p className={styles.stockValue}>{formatQuantity(product.quantity, unitShort)}</p>
            {situation && <StatusPill status={situation} size="lg" />}
            {situation === 'acabou' && product.quantity < 0 && (
              <p className={styles.muted}>
                Vendeu mais do que tinha anotado. Faça uma entrada ou uma contagem.
              </p>
            )}
          </div>
          <div className={styles.stockActions}>
            {MANUAL_MOVEMENTS.map((type) => (
              <Button
                key={type}
                variant="secondary"
                icon={MOVEMENT_UI[type].icon}
                onClick={() => openSheet(type)}
              >
                {MOVEMENT_UI[type].action}
              </Button>
            ))}
          </div>
        </Card>
      )}

      <ProductForm key={product?.id ?? 'novo'} product={product} saving={saving} onSubmit={submit} />

      {product && (
        <Card className={styles.history}>
          <CardHeader
            title="Histórico do estoque"
            description={product.trackStock ? undefined : 'Este produto não tem controle de estoque.'}
            headingLevel="h2"
          />
          <MovementHistory movements={movements} unitShort={unitShort} saleNumbers={saleNumbers} />
        </Card>
      )}

      {product?.trackStock && (
        <StockMovementSheet
          key={sheetKey}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          product={product}
          type={sheetType}
          loading={movement.saving}
          onConfirm={async (input) => {
            if (await movement.save(product, input)) setSheetOpen(false);
          }}
        />
      )}
    </>
  );
}
