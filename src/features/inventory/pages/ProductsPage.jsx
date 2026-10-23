import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { PackageX, Plus, RotateCcw, SearchX, Wallet } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { PageHeader } from '@/components/layout';
import { Button, Card, Chip, ChipGroup, EmptyState, SearchBar, Skeleton, StatCard } from '@/components/ui';
import { PRODUCT_CATEGORIES, STOCK_STATUS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { compareStockUrgency, stockStatus, stockValue } from '@/domain/rules/stock.js';
import { useDataStatus } from '@/hooks/useData.js';
import { useProducts } from '@/hooks/useProducts.js';
import { plural } from '@/lib/format.js';
import { normalizeSearch } from '@/lib/text.js';
import { ProductRow } from '../components/ProductRow.jsx';
import { StockMovementSheet } from '../components/StockMovementSheet.jsx';
import { useStockMovement } from '../useStockMovement.js';
import styles from './ProductsPage.module.css';

/** Filtros de situação. Produtos fora da venda só aparecem no próprio filtro. */
const SITUATIONS = [
  { value: 'todos', label: 'Todos', match: (p) => p.active },
  {
    value: 'acabando',
    label: 'Acabando',
    match: (p) => p.active && stockStatus(p) === STOCK_STATUS.ACABANDO,
  },
  { value: 'acabou', label: 'Acabou', match: (p) => p.active && stockStatus(p) === STOCK_STATUS.ACABOU },
  { value: 'sem_controle', label: 'Sem controle', match: (p) => p.active && !p.trackStock },
  { value: 'fora', label: 'Fora da venda', match: (p) => !p.active },
];
const ALL_CATEGORIES = 'todas';

/**
 * Estoque (seção 5 de docs/regras-de-negocio.md): o que acabou e o que está acabando
 * primeiro, filtros de situação e categoria na barra de endereço, busca, valor parado
 * no estoque e "Entrada" direto na lista, com "Desfazer".
 */
export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const { status, reload } = useDataStatus();
  const { products } = useProducts();
  const movement = useStockMovement();
  const [query, setQuery] = useState('');
  const [entryProductId, setEntryProductId] = useState(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryKey, setEntryKey] = useState(0);

  const situation = SITUATIONS.find((s) => s.value === params.get('situacao')) ?? SITUATIONS[0];
  const category = PRODUCT_CATEGORIES.some((c) => c.value === params.get('categoria'))
    ? params.get('categoria')
    : ALL_CATEGORIES;

  const counts = useMemo(
    () => Object.fromEntries(SITUATIONS.map((s) => [s.value, products.filter(s.match).length])),
    [products],
  );
  const usedCategories = useMemo(
    () => PRODUCT_CATEGORIES.filter((c) => products.some((p) => p.category === c.value)),
    [products],
  );
  const value = useMemo(() => stockValue(products), [products]);

  const visible = useMemo(() => {
    const term = normalizeSearch(query.trim());
    return products
      .filter(situation.match)
      .filter((p) => category === ALL_CATEGORIES || p.category === category)
      .filter((p) => !term || normalizeSearch(p.name).includes(term) || p.code?.includes(term))
      .sort(compareStockUrgency);
  }, [products, situation, category, query]);

  const entryProduct = products.find((p) => p.id === entryProductId) ?? null;

  const setFilter = (key, next, fallback) => {
    const search = new URLSearchParams(params);
    if (next === fallback) search.delete(key);
    else search.set(key, next);
    setParams(search, { replace: true });
  };

  const header = (
    <PageHeader
      title="Estoque"
      description="Seus produtos, quanto tem de cada um e o que precisa repor."
      actions={
        <Button as={Link} to={ROUTES.newProduct} icon={Plus}>
          Produto novo
        </Button>
      }
    />
  );

  if (status === 'loading') {
    return (
      <>
        {header}
        <div className={styles.loading} aria-busy="true" aria-label="Carregando o estoque">
          <div className={styles.stats}>
            <Skeleton shape="rect" height="6rem" />
            <Skeleton shape="rect" height="6rem" />
          </div>
          {Array.from({ length: 5 }, (_, index) => (
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
            title="Não deu para carregar o estoque"
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

  if (products.length === 0) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            emoji="📦"
            title="Você ainda não tem produtos"
            description="Cadastre o que você vende para vender mais rápido e saber quando repor."
            action={
              <Button as={Link} to={ROUTES.newProduct} icon={Plus}>
                Cadastrar o primeiro produto
              </Button>
            }
          />
        </Card>
      </>
    );
  }

  const toRestock = counts.acabando + counts.acabou;

  return (
    <>
      {header}

      <section aria-label="Resumo do estoque" className={styles.stats}>
        <StatCard
          label="Precisa repor"
          value={plural(toRestock, 'produto')}
          icon={PackageX}
          tone={counts.acabou > 0 ? 'danger' : toRestock > 0 ? 'warning' : 'success'}
          hint={
            toRestock > 0
              ? `${plural(counts.acabou, 'acabou', 'acabaram')}, ${counts.acabando} acabando`
              : 'Tudo com estoque'
          }
        />
        <StatCard
          label="Valor em estoque"
          value={formatBRL(value.costCents)}
          icon={Wallet}
          tone="info"
          hint={
            value.missingCostCount > 0
              ? `Pelo custo. ${plural(value.missingCostCount, 'produto')} sem custo`
              : `Pelo custo. Vendendo tudo: ${formatBRL(value.saleCents)}`
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
              onClick={() => setFilter('situacao', option.value, 'todos')}
            >
              {option.label}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup label="Categoria">
          <Chip
            selected={category === ALL_CATEGORIES}
            onClick={() => setFilter('categoria', ALL_CATEGORIES, ALL_CATEGORIES)}
          >
            Todas
          </Chip>
          {usedCategories.map((option) => (
            <Chip
              key={option.value}
              emoji={option.emoji}
              selected={category === option.value}
              onClick={() => setFilter('categoria', option.value, ALL_CATEGORIES)}
            >
              {option.label}
            </Chip>
          ))}
        </ChipGroup>
        <SearchBar value={query} onChange={setQuery} label="Procurar produto" placeholder="Nome ou código…" />
      </div>

      <p className={styles.summary} aria-live="polite">
        {plural(visible.length, 'produto')}
      </p>

      {visible.length === 0 ? (
        <Card>
          {query || category !== ALL_CATEGORIES ? (
            <EmptyState
              icon={SearchX}
              title="Nenhum produto encontrado"
              description="Mude os filtros ou procure de outro jeito."
            />
          ) : (
            <EmptyState
              emoji={situation.value === 'acabou' || situation.value === 'acabando' ? '🎉' : '📦'}
              title={
                situation.value === 'acabou'
                  ? 'Nada acabou'
                  : situation.value === 'acabando'
                    ? 'Nada está acabando'
                    : 'Nenhum produto aqui'
              }
            />
          )}
        </Card>
      ) : (
        <ul role="list" className={styles.list} aria-label="Produtos">
          {visible.map((product) => (
            <li key={product.id}>
              <ProductRow
                product={product}
                onEntry={() => {
                  setEntryKey((key) => key + 1);
                  setEntryProductId(product.id);
                  setEntryOpen(true);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {entryProduct && (
        <StockMovementSheet
          key={entryKey}
          open={entryOpen}
          onClose={() => setEntryOpen(false)}
          product={entryProduct}
          type="entrada"
          loading={movement.saving}
          onConfirm={async (input) => {
            if (await movement.save(entryProduct, input)) setEntryOpen(false);
          }}
        />
      )}
    </>
  );
}
