import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, SearchX } from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { Button, Chip, ChipGroup, EmptyState, SearchBar } from '@/components/ui';
import { PRODUCT_CATEGORIES } from '@/domain/constants.js';
import { CustomAmountTile, ProductTile } from './ProductTile.jsx';
import styles from './ProductPicker.module.css';

const ALL = 'todos';

/** Busca sem acento e sem diferença de maiúsculas: "agua" acha "Água". */
function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Escolha de produtos: busca, categorias e a grade de cards grandes.
 *
 * @param {object} props
 * @param {import('@/domain/models.js').Product[]} props.products ativos, na ordem de exibição
 * @param {Map<string, number>} props.quantities quantidade de cada produto no carrinho
 * @param {(product: import('@/domain/models.js').Product) => void} props.onAdd
 * @param {() => void} props.onCustomAmount abre o "Valor avulso"
 */
export function ProductPicker({ products, quantities, onAdd, onCustomAmount }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);

  const categories = useMemo(() => {
    const used = new Set(products.map((product) => product.category));
    return PRODUCT_CATEGORIES.filter((option) => used.has(option.value));
  }, [products]);

  const visible = useMemo(() => {
    const term = normalize(query.trim());
    return products.filter(
      (product) =>
        (category === ALL || product.category === category) &&
        (!term || normalize(product.name).includes(term) || product.code?.includes(term)),
    );
  }, [products, query, category]);

  if (products.length === 0) {
    return (
      <div className={styles.picker}>
        <div className={styles.grid}>
          <CustomAmountTile onClick={onCustomAmount} />
        </div>
        <EmptyState
          emoji="📦"
          title="Você ainda não cadastrou produtos"
          description="Cadastre o que você vende para vender com um toque. Enquanto isso, use o Valor avulso."
          action={
            <Button as={Link} to={ROUTES.newProduct} variant="secondary" icon={Plus}>
              Cadastrar produto
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.picker}>
      <SearchBar value={query} onChange={setQuery} label="Procurar produto" placeholder="Procurar produto…" />
      {categories.length > 1 && (
        <ChipGroup label="Categorias">
          <Chip selected={category === ALL} onClick={() => setCategory(ALL)}>
            Todos
          </Chip>
          {categories.map((option) => (
            <Chip
              key={option.value}
              emoji={option.emoji}
              selected={category === option.value}
              onClick={() => setCategory(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </ChipGroup>
      )}

      <ul role="list" className={styles.grid} aria-label="Produtos">
        {!query && category === ALL && (
          <li>
            <CustomAmountTile onClick={onCustomAmount} />
          </li>
        )}
        {visible.map((product) => (
          <li key={product.id}>
            <ProductTile product={product} inCart={quantities.get(product.id)} onAdd={() => onAdd(product)} />
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <EmptyState
          compact
          icon={SearchX}
          title="Nenhum produto encontrado"
          description="Confira o nome ou venda como valor avulso."
          action={
            <Button variant="secondary" onClick={onCustomAmount}>
              Vender valor avulso
            </Button>
          }
        />
      )}
    </div>
  );
}
