import { useState } from 'react';
import { ChevronDown, ChevronUp, CircleAlert, CircleCheck, Info, Save, ScanBarcode } from 'lucide-react';
import { Button, Card, CardHeader, Input, MoneyInput, QuantityInput, Select, Switch } from '@/components/ui';
import { PRODUCT_CATEGORIES, PRODUCT_COLORS, UNITS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { calcMargin, isSellingAtLoss, unitProfit, validateProduct } from '@/domain/rules/stock.js';
import { formatPercent } from '@/lib/format.js';
import { cx } from '@/lib/cx.js';
import { ProductTile } from '@/features/sales/components/ProductTile.jsx';
import { PRODUCT_EMOJIS } from '../emojis.js';
import styles from './ProductForm.module.css';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Escolha a categoria' },
  ...PRODUCT_CATEGORIES.map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` })),
];
const UNIT_OPTIONS = Object.entries(UNITS).map(([value, unit]) => ({
  value,
  label: `${unit.label} (${unit.short})`,
}));

/** Sugestões visíveis antes de "Ver mais emojis": poucas escolhas são mais fáceis. */
const FEW_EMOJIS = 12;

const FIELD_MESSAGES = {
  nome_obrigatorio: 'Digite o nome do produto.',
  preco_invalido: 'Digite o preço de venda.',
  categoria_invalida: 'Escolha a categoria.',
  unidade_invalida: 'Escolha a unidade.',
  quantidade_invalida: 'Confira a quantidade.',
};

/**
 * Cadastro e edição de produto (regras 5.1 e 5.2) com a prévia do card como ele aparece
 * na tela de vender (`ProductTile`) e o lucro de cada unidade, com o alerta de "vendendo
 * no prejuízo". Valida com as regras antes de enviar. Remonte com `key` ao trocar de produto.
 *
 * @param {object} props
 * @param {import('@/domain/models.js').Product|null} props.product nulo para produto novo
 * @param {boolean} [props.saving]
 * @param {(input: object) => void} props.onSubmit dados prontos para `createProduct`/`updateProduct`
 */
export function ProductForm({ product, saving, onSubmit }) {
  const isNew = !product;
  const [name, setName] = useState(product?.name ?? '');
  const [emoji, setEmoji] = useState(product?.emoji ?? '📦');
  const [emojiTouched, setEmojiTouched] = useState(!isNew);
  const [color, setColor] = useState(product?.color ?? 'verde');
  const [category, setCategory] = useState(product?.category ?? '');
  const [unit, setUnit] = useState(product?.unit ?? 'un');
  const [priceCents, setPriceCents] = useState(product?.priceCents ?? 0);
  const [costCents, setCostCents] = useState(product?.costCents ?? 0);
  const [trackStock, setTrackStock] = useState(product?.trackStock ?? true);
  const [quantity, setQuantity] = useState(0);
  const [minQuantity, setMinQuantity] = useState(product?.minQuantity ?? 0);
  const [code, setCode] = useState(product?.code ?? '');
  const [active, setActive] = useState(product?.active ?? true);
  const [errors, setErrors] = useState({});
  const [allEmojis, setAllEmojis] = useState(false);

  const cost = costCents > 0 ? costCents : null;
  const profit = unitProfit(priceCents, cost);
  const margin = calcMargin(priceCents, cost);
  const atLoss = isSellingAtLoss(priceCents, cost);
  const emojiChoices = PRODUCT_EMOJIS.includes(emoji) ? PRODUCT_EMOJIS : [emoji, ...PRODUCT_EMOJIS];
  const fewChoices = emojiChoices.slice(0, FEW_EMOJIS);
  const visibleEmojis = allEmojis
    ? emojiChoices
    : fewChoices.includes(emoji)
      ? fewChoices
      : [emoji, ...fewChoices.slice(0, FEW_EMOJIS - 1)];

  const clearError = (field) => setErrors((current) => ({ ...current, [field]: undefined }));

  const preview = {
    id: product?.id ?? 'previa',
    name: name.trim() || 'Nome do produto',
    emoji,
    color,
    unit,
    priceCents,
    trackStock,
    quantity: isNew ? quantity : product.quantity,
    minQuantity,
  };

  const submit = (event) => {
    event.preventDefault();
    const input = {
      name,
      emoji,
      color,
      category,
      unit,
      priceCents,
      costCents: cost,
      trackStock,
      minQuantity: trackStock ? minQuantity : 0,
      code: code.trim() || null,
      active,
      ...(isNew && trackStock ? { quantity } : {}),
    };
    const codes = validateProduct(input);
    if (priceCents === 0 && !codes.includes('preco_invalido')) codes.push('preco_invalido');
    if (codes.length > 0) {
      setErrors({
        name: codes.includes('nome_obrigatorio') ? FIELD_MESSAGES.nome_obrigatorio : undefined,
        price: codes.includes('preco_invalido') ? FIELD_MESSAGES.preco_invalido : undefined,
        category: codes.includes('categoria_invalida') ? FIELD_MESSAGES.categoria_invalida : undefined,
        unit: codes.includes('unidade_invalida') ? FIELD_MESSAGES.unidade_invalida : undefined,
        quantity: codes.includes('quantidade_invalida') ? FIELD_MESSAGES.quantidade_invalida : undefined,
      });
      return;
    }
    onSubmit(input);
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.aside} aria-label="Prévia do produto">
        <Card className={styles.previewCard}>
          <CardHeader title="Como aparece na hora de vender" headingLevel="h2" />
          <div className={styles.tile} inert>
            <ProductTile product={preview} onAdd={() => {}} />
          </div>
        </Card>
      </aside>

      <form className={styles.form} onSubmit={submit} noValidate>
        <Card className={styles.section}>
          <CardHeader title="O produto" headingLevel="h2" />
          <Input
            label="Nome"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearError('name');
            }}
            error={errors.name}
            placeholder="Ex.: Coxinha"
            autoComplete="off"
            maxLength={60}
          />
          <Select
            label="Categoria"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(event) => {
              const next = event.target.value;
              setCategory(next);
              clearError('category');
              // Enquanto a pessoa não escolheu um emoji, o da categoria serve de sugestão.
              const suggestion = PRODUCT_CATEGORIES.find((c) => c.value === next)?.emoji;
              if (!emojiTouched && suggestion) setEmoji(suggestion);
            }}
            error={errors.category}
          />

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Emoji</legend>
            <div className={styles.emojis}>
              {visibleEmojis.map((option) => (
                <label key={option} className={styles.emojiOption}>
                  <input
                    type="radio"
                    name="emoji"
                    value={option}
                    checked={emoji === option}
                    onChange={() => {
                      setEmoji(option);
                      setEmojiTouched(true);
                    }}
                    className="visually-hidden"
                  />
                  {option}
                </label>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={allEmojis ? ChevronUp : ChevronDown}
              onClick={() => setAllEmojis((current) => !current)}
              className={styles.more}
            >
              {allEmojis ? 'Ver menos emojis' : 'Ver mais emojis'}
            </Button>
            <Input
              label="Outro emoji"
              optional
              value={PRODUCT_EMOJIS.includes(emoji) ? '' : emoji}
              onChange={(event) => {
                const value = event.target.value.trim();
                setEmoji(value || '📦');
                setEmojiTouched(true);
              }}
              hint="Toque no campo e escolha um emoji no teclado do celular."
              maxLength={8}
            />
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Cor do card</legend>
            <div className={styles.colors}>
              {PRODUCT_COLORS.map((option) => (
                <label key={option.value} className={styles.colorOption}>
                  <input
                    type="radio"
                    name="cor"
                    value={option.value}
                    checked={color === option.value}
                    onChange={() => setColor(option.value)}
                    className="visually-hidden"
                  />
                  <span
                    className={styles.swatch}
                    style={{ '--swatch': `var(--product-${option.value})` }}
                    aria-hidden="true"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card className={styles.section}>
          <CardHeader title="Preço" headingLevel="h2" />
          <Select
            label="Vende por"
            options={UNIT_OPTIONS}
            value={unit}
            onChange={(event) => {
              setUnit(event.target.value);
              clearError('unit');
            }}
            error={errors.unit}
          />
          <div className={styles.money}>
            <MoneyInput
              label={unit === 'un' ? 'Preço de venda' : `Preço de venda por ${UNITS[unit].short}`}
              value={priceCents}
              onChange={(value) => {
                setPriceCents(value);
                clearError('price');
              }}
              size="md"
              error={errors.price}
            />
            <MoneyInput
              label={unit === 'un' ? 'Quanto você paga (custo)' : `Custo por ${UNITS[unit].short}`}
              optional
              value={costCents}
              onChange={setCostCents}
              size="md"
              hint="Deixe zerado se não souber."
            />
          </div>
          <div aria-live="polite">
            {profit == null ? (
              <p className={cx(styles.note, styles.info)}>
                <Info size={20} aria-hidden="true" />
                Coloque o custo para ver quanto você ganha em cada venda.
              </p>
            ) : atLoss ? (
              <p className={cx(styles.note, styles.danger)}>
                <CircleAlert size={20} aria-hidden="true" />
                <span>
                  <strong>Vendendo no prejuízo:</strong> você perde {formatBRL(-profit)} em cada um. Confira o
                  preço.
                </span>
              </p>
            ) : (
              <p className={cx(styles.note, styles.success)}>
                <CircleCheck size={20} aria-hidden="true" />
                <span>
                  Você ganha <strong>{formatBRL(profit)}</strong> em cada um
                  {margin != null && ` (margem de ${formatPercent(margin)})`}.
                </span>
              </p>
            )}
          </div>
        </Card>

        <Card className={styles.section}>
          <CardHeader title="Estoque" headingLevel="h2" />
          <Switch
            label="Controlar o estoque"
            description="Baixa a cada venda e avisa quando estiver acabando. Desligue para o que você prepara na hora."
            checked={trackStock}
            onChange={setTrackStock}
          />
          {trackStock && (
            <div className={styles.money}>
              {isNew && (
                <QuantityInput
                  label="Quanto tem agora?"
                  value={quantity}
                  onChange={(value) => {
                    setQuantity(value);
                    clearError('quantity');
                  }}
                  unit={unit}
                  size="md"
                  error={errors.quantity}
                />
              )}
              <QuantityInput
                label="Avisar quando tiver só"
                value={minQuantity}
                onChange={(value) => {
                  setMinQuantity(value);
                  clearError('quantity');
                }}
                unit={unit}
                size="md"
                hint='Nessa quantidade, o produto aparece como "Acabando".'
              />
            </div>
          )}
          <Input
            label="Código de barras ou código seu"
            optional
            icon={ScanBarcode}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            maxLength={30}
          />
          {!isNew && (
            <Switch
              label="À venda"
              description="Desligue para tirar da tela de vender sem perder o histórico."
              checked={active}
              onChange={setActive}
            />
          )}
        </Card>

        <Button type="submit" size="lg" icon={Save} loading={saving} className={styles.submit}>
          {isNew ? 'Cadastrar produto' : 'Salvar alterações'}
        </Button>
      </form>
    </div>
  );
}
