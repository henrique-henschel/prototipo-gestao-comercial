import { useState } from 'react';
import {
  Banknote,
  ChartColumn,
  Check,
  CreditCard,
  HandCoins,
  Package,
  Phone,
  Plus,
  QrCode,
  Search as SearchIcon,
  ShoppingCart,
  Trash,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  CardHeader,
  Chip,
  ChipGroup,
  DateShortcuts,
  Dialog,
  EmptyState,
  HelpTip,
  IconButton,
  Input,
  LoadError,
  MoneyInput,
  PercentInput,
  ProgressBar,
  QuantityInput,
  QuantityStepper,
  SearchBar,
  SegmentedControl,
  Select,
  Skeleton,
  SkeletonGroup,
  SpeakButton,
  StatCard,
  StatusPill,
  STATUS_PRESETS,
  Switch,
  Tabs,
  Textarea,
} from '@/components/ui';
import { useToast } from '@/hooks/useToast.js';
import { formatBRL } from '@/domain/rules/money.js';
import { addDays, today } from '@/lib/date.js';
import { ChartsSection } from './ChartDemos.jsx';
import { Example, Section } from './Showcase.jsx';
import styles from './DesignSystemPage.module.css';

const CATEGORIES = [
  { id: 'todos', label: 'Todos', emoji: '🛒', count: 24 },
  { id: 'salgados', label: 'Salgados', emoji: '🥟', count: 8 },
  { id: 'doces', label: 'Doces', emoji: '🍫', count: 6 },
  { id: 'bebidas', label: 'Bebidas', emoji: '🥤', count: 7 },
  { id: 'frutas', label: 'Frutas', emoji: '🍎', count: 3 },
  { id: 'outros', label: 'Outros', emoji: '📦', count: 2 },
];

const PEOPLE = ['Maria da Silva', 'João Pereira', 'Ana Souza', 'Zé do Caldo', 'Luiza Fernandes'];

/** Valor por extenso simples para leitura em voz alta: 1250 → "12 reais e 50 centavos". */
function spokenMoney(cents) {
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  const parts = [];
  if (reais) parts.push(`${reais} ${reais === 1 ? 'real' : 'reais'}`);
  if (centavos) parts.push(`${centavos} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  return parts.join(' e ') || 'zero reais';
}

export function ComponentDemos() {
  return (
    <>
      <ButtonsSection />
      <FieldsSection />
      <MoneySection />
      <SelectionSection />
      <StatusSection />
      <CardsSection />
      <ChartsSection />
      <FeedbackSection />
      <OverlaysSection />
      <MiscSection />
    </>
  );
}

function ButtonsSection() {
  const [loading, setLoading] = useState(false);

  return (
    <Section
      id="botoes"
      title="Botões"
      description="Sempre com texto. Uma ação principal por tela; as outras ficam como secundária ou discreta."
    >
      <div className={styles.exampleGrid}>
        <Example title="Variantes">
          <div className="cluster">
            <Button icon={Check}>Principal</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Discreto</Button>
            <Button variant="accent" icon={HandCoins}>
              Fiado
            </Button>
            <Button variant="danger" icon={Trash}>
              Excluir
            </Button>
          </div>
        </Example>
        <Example title="Tamanhos" note="sm · md · lg">
          <div className="cluster">
            <Button size="sm">Pequeno</Button>
            <Button>Médio</Button>
            <Button size="lg">Grande</Button>
          </div>
        </Example>
        <Example title="Estados" note="carregando e desabilitado">
          <div className="cluster">
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1500);
              }}
            >
              {loading ? 'Salvando…' : 'Toque para salvar'}
            </Button>
            <Button disabled>Indisponível</Button>
          </div>
        </Example>
        <Example title="Somente ícone" note="só para ações óbvias, com rótulo acessível">
          <div className="cluster">
            <IconButton label="Fechar" icon={X} />
            <IconButton label="Buscar" icon={SearchIcon} variant="soft" />
            <IconButton label="Adicionar" icon={Plus} variant="primary" />
            <IconButton label="Excluir" icon={Trash} variant="danger" />
          </div>
        </Example>
        <Example title="Ação principal da tela" note="tamanho hero, largura total" wide>
          <Button size="hero" fullWidth icon={ShoppingCart}>
            Cobrar {formatBRL(2500)}
          </Button>
        </Example>
      </div>
    </Section>
  );
}

function FieldsSection() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [unit, setUnit] = useState('un');
  const [stockBlock, setStockBlock] = useState(false);
  const [vibrate, setVibrate] = useState(true);

  return (
    <Section
      id="campos"
      title="Campos"
      description="Rótulo sempre visível em cima, dica e erro embaixo. Nada de texto escondido dentro do campo."
    >
      <div className={styles.exampleGrid}>
        <Example title="Texto">
          <div className="stack">
            <Input
              label="Nome do cliente"
              placeholder="Ex.: Maria da Silva"
              value={name}
              onChange={(event) => setName(event.target.value)}
              hint="Pode ser o apelido, do jeito que você conhece."
            />
            <Input
              label="WhatsApp"
              icon={Phone}
              type="tel"
              inputMode="tel"
              placeholder="(11) 91234-5678"
              optional
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
        </Example>
        <Example title="Com erro e sufixo">
          <div className="stack">
            <Input label="Nome do produto" defaultValue="" error="Escreva o nome do produto." />
            <Input label="Taxa da maquininha" defaultValue="3,5" suffix="%" inputMode="decimal" />
          </div>
        </Example>
        <Example title="Lista e texto longo">
          <div className="stack">
            <Select
              label="Unidade"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              options={[
                { value: 'un', label: 'Unidade (un)' },
                { value: 'kg', label: 'Quilo (kg)' },
                { value: 'pacote', label: 'Pacote' },
                { value: 'caixa', label: 'Caixa' },
              ]}
            />
            <Textarea label="Observação" optional placeholder="Ex.: entregar na sexta" />
          </div>
        </Example>
        <Example title="Liga/desliga">
          <div className="stack">
            <Switch
              label="Bloquear venda sem estoque"
              description="Se ligado, não deixa vender o que acabou."
              checked={stockBlock}
              onChange={setStockBlock}
            />
            <Switch label="Vibrar ao concluir" checked={vibrate} onChange={setVibrate} />
            <Switch label="Opção indisponível" checked={false} onChange={() => {}} disabled />
          </div>
        </Example>
      </div>
    </Section>
  );
}

function MoneySection() {
  const [amount, setAmount] = useState(2550);
  const [fee, setFee] = useState(0);
  const [qty, setQty] = useState(2);
  const [kg, setKg] = useState(1.5);
  const [received, setReceived] = useState(12);
  const [weight, setWeight] = useState(1.25);
  const [rate, setRate] = useState(1.99);

  return (
    <Section
      id="valores"
      title="Valores e quantidades"
      description="Dinheiro é digitado como na calculadora: os números entram pela direita, sem precisar de vírgula. Valores sempre em centavos no código."
    >
      <div className={styles.exampleGrid}>
        <Example title="Valor com teclado próprio" note="segure ⌫ para limpar">
          <div className="stack">
            <MoneyInput
              label="Quanto o cliente deu?"
              value={amount}
              onChange={setAmount}
              size="hero"
              keypad
            />
            <div className="cluster">
              <SpeakButton text={`Valor: ${spokenMoney(amount)}`} />
            </div>
          </div>
        </Example>
        <div className="stack">
          <Example title="Valor com teclado do aparelho">
            <MoneyInput
              label="Preço de venda"
              value={fee}
              onChange={setFee}
              size="md"
              hint="Digite só os números: 1, 5, 0 vira R$ 1,50."
            />
          </Example>
          <Example title="Quantidade digitada" note="sem vírgula: em kg, 1, 2, 5, 0 vira 1,250">
            <div className="stack">
              <QuantityInput
                label="Quantas chegaram?"
                value={received}
                onChange={setReceived}
                unit="un"
                size="md"
              />
              <QuantityInput label="Peso" value={weight} onChange={setWeight} unit="kg" size="md" />
            </div>
          </Example>
          <Example title="Porcentagem digitada" note="taxas: 1, 9, 9 vira 1,99%">
            <PercentInput
              label="Taxa do débito"
              value={rate}
              onChange={setRate}
              size="md"
              hint="Digite só os números, sem vírgula."
            />
          </Example>
          <Example title="Quantidade">
            <div className="stack">
              <div className={styles.inlineRow}>
                <span>Coxinha</span>
                <QuantityStepper label="Quantidade de coxinha" value={qty} onChange={setQty} min={1} />
              </div>
              <div className={styles.inlineRow}>
                <span>Banana</span>
                <QuantityStepper
                  label="Quantidade de banana"
                  value={kg}
                  onChange={setKg}
                  step={0.25}
                  unit="kg"
                />
              </div>
              <div className={styles.inlineRow}>
                <span>Compacto</span>
                <QuantityStepper label="Quantidade" value={qty} onChange={setQty} size="sm" />
              </div>
            </div>
          </Example>
        </div>
      </div>
    </Section>
  );
}

function SelectionSection() {
  const [category, setCategory] = useState('todos');
  const [discountType, setDiscountType] = useState('reais');
  const [period, setPeriod] = useState('hoje');
  const [tab, setTab] = useState('abertos');

  return (
    <Section id="selecao" title="Seleção" description="Filtros grandes e escolhas de uma opção só.">
      <div className={styles.exampleGrid}>
        <Example title="Chips com rolagem" note="arraste para o lado no celular" wide>
          <ChipGroup label="Categorias">
            {CATEGORIES.map((item) => (
              <Chip
                key={item.id}
                emoji={item.emoji}
                count={item.count}
                selected={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </Chip>
            ))}
          </ChipGroup>
        </Example>
        <Example title="Escolha segmentada">
          <div className="stack">
            <SegmentedControl
              label="Tipo de desconto"
              showLabel
              value={discountType}
              onChange={setDiscountType}
              options={[
                { value: 'reais', label: 'Em R$' },
                { value: 'porcento', label: 'Em %' },
              ]}
            />
            <SegmentedControl
              label="Período"
              fullWidth
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'hoje', label: 'Hoje' },
                { value: 'semana', label: '7 dias' },
                { value: 'mes', label: 'Mês' },
              ]}
            />
          </div>
        </Example>
        <Example title="Abas" note="use as setas do teclado">
          <Tabs
            label="Contas de fiado"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'abertos', label: 'Em aberto', count: 7 },
              { value: 'atrasados', label: 'Atrasados', count: 2 },
              { value: 'pagos', label: 'Pagos' },
            ]}
          >
            {(active) => (
              <p className="text-muted">
                {active === 'abertos' && '7 clientes com conta em aberto.'}
                {active === 'atrasados' && '2 clientes passaram do dia combinado.'}
                {active === 'pagos' && 'Contas pagas nos últimos 30 dias.'}
              </p>
            )}
          </Tabs>
        </Example>
      </div>
    </Section>
  );
}

function StatusSection() {
  return (
    <Section
      id="status"
      title="Status e selos"
      description="O significado vem de três coisas juntas: cor, ícone e palavra. Quem não distingue cores entende do mesmo jeito."
    >
      <div className={styles.exampleGrid}>
        <Example title="Status prontos" note="fiado, estoque e venda" wide>
          <div className="cluster">
            {Object.keys(STATUS_PRESETS).map((status) => (
              <StatusPill key={status} status={status} />
            ))}
          </div>
        </Example>
        <Example title="Com texto próprio e tamanho grande">
          <div className="cluster">
            <StatusPill status="atrasado">Atrasado 5 dias</StatusPill>
            <StatusPill status="vence_em_breve" size="lg">
              Vence em 2 dias
            </StatusPill>
            <StatusPill tone="info" icon={QrCode}>
              Pix
            </StatusPill>
          </div>
        </Example>
        <Example title="Selos">
          <div className="cluster">
            <Badge>12</Badge>
            <Badge tone="primary">Novo</Badge>
            <Badge tone="accent">Fiado</Badge>
            <Badge tone="success" appearance="solid">
              3
            </Badge>
            <Badge tone="danger" appearance="solid">
              9+
            </Badge>
            <Badge tone="info">Dica</Badge>
          </div>
        </Example>
      </div>
    </Section>
  );
}

function CardsSection() {
  return (
    <Section
      id="cards"
      title="Cards e indicadores"
      description="Os indicadores se reorganizam conforme o espaço do próprio card (container queries), não da tela."
    >
      <div className={styles.statGrid}>
        <StatCard
          label="Vendido hoje"
          value={formatBRL(48750)}
          icon={Wallet}
          delta={{ text: '12% a mais que ontem', direction: 'up', positive: true }}
        />
        <StatCard
          label="Lucro estimado"
          value={formatBRL(19820)}
          icon={ChartColumn}
          tone="success"
          hint="Depois dos custos"
        />
        <StatCard
          label="Para receber (fiado)"
          value={formatBRL(31200)}
          icon={HandCoins}
          tone="accent"
          delta={{ text: 'R$ 45,00 a mais', direction: 'up', positive: false }}
        />
        <StatCard label="Acabando" value="4 produtos" icon={Package} tone="warning" hint="Hora de repor" />
      </div>
      <div className={styles.exampleGrid}>
        <Example title="Card com cabeçalho">
          <Card>
            <CardHeader
              title="Formas de pagamento"
              description="Últimos 7 dias"
              icon={CreditCard}
              action={
                <Button variant="ghost" size="sm">
                  Ver tudo
                </Button>
              }
            />
            <ul className={styles.paymentList} role="list">
              <li>
                <Banknote size={20} aria-hidden="true" /> Dinheiro <strong>{formatBRL(120000)}</strong>
              </li>
              <li>
                <QrCode size={20} aria-hidden="true" /> Pix <strong>{formatBRL(98050)}</strong>
              </li>
              <li>
                <CreditCard size={20} aria-hidden="true" /> Cartão <strong>{formatBRL(45000)}</strong>
              </li>
            </ul>
          </Card>
        </Example>
        <Example title="Card tocável" note="cliente na lista de fiado">
          <div className="stack">
            <Card as="button" type="button" interactive padding="sm" className={styles.personCard}>
              <Avatar name="Maria da Silva" />
              <span className={styles.personText}>
                <strong>Maria da Silva</strong>
                <span className="text-muted text-sm">Comprou há 12 dias</span>
              </span>
              <span className={styles.personAmount}>
                <strong>{formatBRL(8500)}</strong>
                <StatusPill status="atrasado">5 dias</StatusPill>
              </span>
            </Card>
            <Card as="button" type="button" interactive padding="sm" className={styles.personCard}>
              <Avatar name="João Pereira" />
              <span className={styles.personText}>
                <strong>João Pereira</strong>
                <span className="text-muted text-sm">Comprou ontem</span>
              </span>
              <span className={styles.personAmount}>
                <strong>{formatBRL(2300)}</strong>
                <StatusPill status="em_dia" />
              </span>
            </Card>
          </div>
        </Example>
      </div>
    </Section>
  );
}

function FeedbackSection() {
  const toast = useToast();
  const [sales, setSales] = useState(12);
  const [paid, setPaid] = useState(1500);
  const total = 4000;

  const registerSale = () => {
    setSales((n) => n + 1);
    toast.show({
      message: 'Venda registrada',
      description: `${formatBRL(2500)} em dinheiro`,
      action: { label: 'Desfazer', onClick: () => setSales((n) => n - 1) },
    });
  };

  return (
    <Section
      id="feedback"
      title="Feedback"
      description='Avisos rápidos com "Desfazer", progresso, carregamento e telas vazias que ensinam o próximo passo.'
    >
      <div className={styles.exampleGrid}>
        <Example title="Avisos (toasts)" note="pausam ao passar o mouse">
          <div className="stack">
            <p>
              Vendas hoje: <strong className="tabular">{sales}</strong>
            </p>
            <div className="cluster">
              <Button icon={Check} onClick={registerSale}>
                Registrar venda
              </Button>
              <Button
                variant="secondary"
                onClick={() => toast.show({ tone: 'info', message: 'Dica: segure ⌫ para limpar o valor.' })}
              >
                Dica
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast.show({
                    tone: 'warning',
                    message: 'Coxinha está acabando',
                    description: 'Restam 3 unidades',
                  })
                }
              >
                Atenção
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast.show({
                    tone: 'danger',
                    message: 'Não deu certo',
                    description: 'Tente de novo em instantes.',
                  })
                }
              >
                Erro
              </Button>
            </div>
          </div>
        </Example>
        <Example title="Progresso" note="pagamento dividido">
          <div className="stack">
            <ProgressBar
              label="Pagamento da venda"
              value={paid}
              max={total}
              valueText={`Pago ${formatBRL(paid)} de ${formatBRL(total)}`}
              size="lg"
              tone={paid >= total ? 'success' : 'primary'}
            />
            <p>
              {paid >= total ? (
                <strong>Tudo pago!</strong>
              ) : (
                <>
                  Falta <strong>{formatBRL(total - paid)}</strong> de {formatBRL(total)}
                </>
              )}
            </p>
            <div className="cluster">
              <Button size="sm" variant="secondary" onClick={() => setPaid((v) => Math.min(total, v + 1000))}>
                + R$ 10,00
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPaid(0)}>
                Zerar
              </Button>
            </div>
            <ProgressBar label="Limite de fiado usado" value={85} tone="warning" size="sm" />
            <span className="text-muted text-sm">Limite de fiado: 85% usado</span>
          </div>
        </Example>
        <Example title="Carregando" note="no formato do conteúdo real">
          <SkeletonGroup label="Carregando os clientes" className="stack">
            {[1, 2, 3].map((row) => (
              <div key={row} className={styles.skeletonRow}>
                <Skeleton shape="circle" />
                <div className={styles.skeletonText}>
                  <Skeleton width="70%" />
                  <Skeleton width="40%" />
                </div>
                <Skeleton width="4rem" />
              </div>
            ))}
          </SkeletonGroup>
        </Example>
        <Example title="Vazio e erro">
          <div className="stack">
            <EmptyState
              compact
              emoji="📦"
              title="Você ainda não tem produtos"
              description="Cadastre o que você vende para vender mais rápido."
              action={<Button icon={Plus}>Adicionar produto</Button>}
            />
          </div>
        </Example>
        <Example title="Erro ao carregar" note="LoadError: o mesmo em todas as telas, com “Tentar de novo”">
          <LoadError
            title="Não deu para carregar as vendas"
            onRetry={() => toast.show({ message: 'Tentando de novo…', tone: 'info' })}
          />
        </Example>
      </div>
    </Section>
  );
}

function OverlaysSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dueDate, setDueDate] = useState(() => addDays(today(), 30));
  const toast = useToast();

  return (
    <Section
      id="sobreposicoes"
      title="Janelas e ajuda"
      description="Diálogo e painel usam o <dialog> nativo (foco, Esc e fundo prontos). A ajuda usa a Popover API e se posiciona com CSS Anchor Positioning."
    >
      <div className={styles.exampleGrid}>
        <Example title="Diálogo" note="para decisões importantes">
          <Button variant="danger" icon={Trash} onClick={() => setDialogOpen(true)}>
            Cancelar venda
          </Button>
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            size="sm"
            title="Cancelar esta venda?"
            description="O estoque volta e a venda sai do caixa de hoje."
            footer={
              <>
                <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                  Voltar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setDialogOpen(false);
                    toast.show({ tone: 'info', message: 'Venda cancelada' });
                  }}
                >
                  Sim, cancelar
                </Button>
              </>
            }
          >
            <p>
              Venda de <strong>{formatBRL(2500)}</strong> às 14:32, em dinheiro.
            </p>
          </Dialog>
        </Example>
        <Example title="Painel de baixo" note="sobe de baixo no celular">
          <Button variant="accent" icon={HandCoins} onClick={() => setSheetOpen(true)}>
            Vender fiado
          </Button>
          <BottomSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title="Fiado para Maria da Silva"
            description={`Valor: ${formatBRL(2500)}`}
            footer={
              <Button
                size="lg"
                icon={Check}
                onClick={() => {
                  setSheetOpen(false);
                  toast.show({ message: 'Fiado registrado', description: 'Maria da Silva' });
                }}
              >
                Confirmar fiado
              </Button>
            }
          >
            <DateShortcuts label="Quando vai pagar?" value={dueDate} onChange={setDueDate} />
          </BottomSheet>
        </Example>
        <Example title="Ajuda no contexto">
          <p className={styles.helpLine}>
            Limite de fiado
            <HelpTip title="O que é limite de fiado?">
              É o valor máximo que o cliente pode ficar devendo. Se passar, o aplicativo avisa antes de
              vender.
            </HelpTip>
          </p>
        </Example>
      </div>
    </Section>
  );
}

function MiscSection() {
  const [query, setQuery] = useState('');
  const filtered = PEOPLE.filter((person) => person.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Section id="diversos" title="Pessoas e busca">
      <div className={styles.exampleGrid}>
        <Example title="Avatares" note="cor estável por pessoa">
          <div className="cluster">
            {PEOPLE.map((person) => (
              <Avatar key={person} name={person} />
            ))}
            <Avatar name="Maria da Silva" size="lg" />
            <Avatar name="João Pereira" size="sm" />
          </div>
        </Example>
        <Example title="Busca">
          <div className="stack">
            <SearchBar
              value={query}
              onChange={setQuery}
              label="Buscar cliente"
              placeholder="Buscar cliente…"
            />
            {filtered.length > 0 ? (
              <ul className={styles.searchList} role="list">
                {filtered.map((person) => (
                  <li key={person}>
                    <Avatar name={person} size="sm" /> {person}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={Users}
                title="Ninguém com esse nome"
                description="Confira o nome digitado."
              />
            )}
          </div>
        </Example>
      </div>
    </Section>
  );
}
