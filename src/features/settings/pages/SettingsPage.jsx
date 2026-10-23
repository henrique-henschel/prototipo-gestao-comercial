import { useState } from 'react';
import {
  Accessibility,
  CalendarClock,
  Contrast,
  CreditCard,
  DatabaseBackup,
  FlaskConical,
  KeyRound,
  Monitor,
  Moon,
  Package,
  Pencil,
  Percent,
  RotateCcw,
  Store,
  Sun,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button, Card, Chip, ChipGroup, Dialog, EmptyState, Skeleton, Switch } from '@/components/ui';
import { PAYMENT_METHOD_KEYS, PAYMENT_METHODS } from '@/domain/constants.js';
import { formatBRL } from '@/domain/rules/money.js';
import { canDisablePaymentMethod } from '@/domain/rules/settings.js';
import { useDataStatus } from '@/hooks/useData.js';
import { usePreferences } from '@/hooks/usePreferences.js';
import { useSettings } from '@/hooks/useSettings.js';
import { useToast } from '@/hooks/useToast.js';
import { formatPhone, formatRate, plural } from '@/lib/format.js';
import { configureApi, getApiConfig } from '@/services/api.js';
import { FONT_SCALES } from '@/store/preferences-context.js';
import { PAYMENT_ICONS } from '@/features/sales/paymentIcons.js';
import { BusinessSheet, DefaultOpeningSheet, FeeSheet, PixKeySheet } from '../components/SettingsSheets.jsx';
import { useSaveSettings } from '../useSaveSettings.js';
import styles from './SettingsPage.module.css';

const FEES = [
  { key: 'debito', label: 'Cartão de débito' },
  { key: 'creditoAVista', label: 'Crédito à vista' },
  { key: 'creditoParcelado', label: 'Crédito parcelado' },
];

/** Prazos oferecidos para o vencimento padrão do fiado (regra 3.2). */
const FIADO_DAYS = [7, 15, 30, 45, 60];

const THEMES = [
  { value: 'system', label: 'Igual ao celular', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'contrast', label: 'Alto contraste', icon: Contrast },
];

/**
 * Ajustes: dados do negócio, Pix, formas de pagamento e taxas, regras de fiado, estoque e
 * caixa (tabela da regra 9), aparência e acessibilidade (deste aparelho), modo
 * demonstração e "Restaurar dados de exemplo".
 *
 * Tudo vale na hora: chaves e fichas salvam ao tocar, e os valores abrem uma janela com
 * "Salvar". Cada alteração mostra o aviso com "Desfazer", sem "Tem certeza?"; só
 * restaurar os dados de exemplo, que não tem volta, pede confirmação.
 */
export default function SettingsPage() {
  const { status, reload } = useDataStatus();
  const { business, settings } = useSettings();
  const save = useSaveSettings();
  /** Janela aberta: 'negocio', 'pix', 'troco' ou a chave de uma taxa. */
  const [sheet, setSheet] = useState(null);
  const close = () => setSheet(null);

  const header = <PageHeader title="Ajustes" description="Do seu negócio, das vendas e deste aparelho." />;

  if (status === 'loading' && !settings) {
    return (
      <>
        {header}
        <div className={styles.sections} aria-busy="true" aria-label="Carregando os ajustes">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} shape="rect" height="10rem" />
          ))}
        </div>
      </>
    );
  }

  if (!settings || !business) {
    return (
      <>
        {header}
        <Card>
          <EmptyState
            tone="danger"
            emoji="📡"
            title="Não deu para carregar os ajustes"
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

  const fee = FEES.find((option) => option.key === sheet);

  return (
    <>
      {header}

      <div className={styles.sections}>
        <Card as="section" aria-labelledby="ajuste-negocio" className={styles.card}>
          <SectionTitle id="ajuste-negocio" icon={Store} title="Seu negócio" />
          <dl className={styles.rows}>
            <Row label="Nome" value={business.name || 'Sem nome'} />
            <Row label="WhatsApp" value={business.phone ? formatPhone(business.phone) : 'Não informado'} />
          </dl>
          <EditButton onClick={() => setSheet('negocio')} context="os dados do negócio" />
        </Card>

        <Card as="section" aria-labelledby="ajuste-pix" className={styles.card}>
          <SectionTitle
            id="ajuste-pix"
            icon={KeyRound}
            title="Chave Pix"
            description="Aparece na hora de receber por Pix e na cobrança do fiado."
          />
          <p className={styles.value}>{settings.pixKey || 'Nenhuma chave cadastrada'}</p>
          <EditButton onClick={() => setSheet('pix')} context="a chave Pix" />
        </Card>

        <PaymentMethodsCard settings={settings} save={save} />

        <Card as="section" aria-labelledby="ajuste-taxas" className={styles.card}>
          <SectionTitle
            id="ajuste-taxas"
            icon={Percent}
            title="Taxas da maquininha"
            description="O cliente paga o mesmo valor. A taxa sai do seu lucro."
          />
          <ul role="list" className={styles.list}>
            {FEES.map((option) => (
              <li key={option.key} className={styles.feeRow}>
                <span className={styles.feeText}>
                  <span>{option.label}</span>
                  <strong className={styles.number}>{formatRate(settings.fees[option.key])}</strong>
                </span>
                <EditButton
                  onClick={() => setSheet(option.key)}
                  context={`a taxa do ${option.label.toLowerCase()}`}
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card as="section" aria-labelledby="ajuste-fiado" className={styles.card}>
          <SectionTitle
            id="ajuste-fiado"
            icon={CalendarClock}
            title="Prazo do fiado"
            description="Ao vender fiado, o vencimento já vem com este prazo. Dá para mudar em cada venda."
          />
          <ChipGroup label="Prazo para pagar o fiado" wrap>
            {FIADO_DAYS.map((days) => (
              <Chip
                key={days}
                selected={settings.fiadoDefaultDays === days}
                onClick={() =>
                  settings.fiadoDefaultDays !== days &&
                  save({
                    settings: { fiadoDefaultDays: days },
                    message: `Fiado vence em ${plural(days, 'dia')}`,
                  })
                }
              >
                {plural(days, 'dia')}
              </Chip>
            ))}
          </ChipGroup>
        </Card>

        <Card as="section" aria-labelledby="ajuste-estoque" className={styles.card}>
          <SectionTitle id="ajuste-estoque" icon={Package} title="Estoque" />
          <Switch
            label="Não vender o que acabou"
            description="Ligado: não deixa vender mais do que tem no estoque. Desligado: só avisa antes de cobrar."
            checked={settings.blockSaleWithoutStock}
            onChange={(checked) =>
              save({
                settings: { blockSaleWithoutStock: checked },
                message: checked ? 'Venda sem estoque bloqueada' : 'Venda sem estoque liberada, com aviso',
              })
            }
          />
        </Card>

        <Card as="section" aria-labelledby="ajuste-caixa" className={styles.card}>
          <SectionTitle
            id="ajuste-caixa"
            icon={Wallet}
            title="Troco inicial do caixa"
            description="Quanto você costuma deixar na gaveta. Ele já vem preenchido ao abrir o caixa."
          />
          <p className={`${styles.value} ${styles.number}`}>{formatBRL(settings.defaultOpeningCents)}</p>
          <EditButton onClick={() => setSheet('troco')} context="o troco inicial" />
        </Card>

        <AccessibilityCard />

        <DemoCard />

        <ResetCard />
      </div>

      {sheet === 'negocio' && (
        <BusinessSheet
          open
          onClose={close}
          business={business}
          onSave={(changes) => save({ business: changes, message: 'Dados do negócio salvos' })}
        />
      )}
      {sheet === 'pix' && (
        <PixKeySheet
          open
          onClose={close}
          pixKey={settings.pixKey}
          onSave={(pixKey) =>
            save({ settings: { pixKey }, message: pixKey ? 'Chave Pix salva' : 'Chave Pix apagada' })
          }
        />
      )}
      {fee && (
        <FeeSheet
          open
          onClose={close}
          label={fee.label}
          value={settings.fees[fee.key]}
          onSave={(value) =>
            save({
              settings: { fees: { [fee.key]: value } },
              message: `Taxa do ${fee.label.toLowerCase()}: ${formatRate(value)}`,
            })
          }
        />
      )}
      {sheet === 'troco' && (
        <DefaultOpeningSheet
          open
          onClose={close}
          value={settings.defaultOpeningCents}
          onSave={(cents) =>
            save({
              settings: { defaultOpeningCents: cents },
              message: `Troco inicial: ${formatBRL(cents)}`,
            })
          }
        />
      )}
    </>
  );
}

function SectionTitle({ id, icon: Icon, title, description }) {
  return (
    <header className={styles.sectionHeader}>
      <h2 id={id} className={styles.sectionTitle}>
        <Icon size={22} aria-hidden="true" />
        {title}
      </h2>
      {description && <p className={styles.muted}>{description}</p>}
    </header>
  );
}

function Row({ label, value }) {
  return (
    <div className={styles.row}>
      <dt className={styles.muted}>{label}</dt>
      <dd className={styles.rowValue}>{value}</dd>
    </div>
  );
}

/** "Mudar", com o que muda escrito para o leitor de tela. */
function EditButton({ onClick, context }) {
  return (
    <Button variant="secondary" icon={Pencil} onClick={onClick} className={styles.edit}>
      Mudar<span className="visually-hidden"> {context}</span>
    </Button>
  );
}

/** Formas de pagamento aceitas (regra 2): a última ligada não pode ser desligada. */
function PaymentMethodsCard({ settings, save }) {
  return (
    <Card as="section" aria-labelledby="ajuste-formas" className={styles.card}>
      <SectionTitle
        id="ajuste-formas"
        icon={CreditCard}
        title="Formas de pagamento"
        description="Só as formas ligadas aparecem na hora de cobrar."
      />
      <ul role="list" className={styles.list}>
        {PAYMENT_METHOD_KEYS.map((method) => {
          const on = settings.paymentMethods[method];
          const locked = on && !canDisablePaymentMethod(settings, method);
          const Icon = PAYMENT_ICONS[method];
          return (
            <li key={method} className={styles.method}>
              <Icon size={24} aria-hidden="true" className={styles.methodIcon} />
              <Switch
                label={PAYMENT_METHODS[method].label}
                description={locked ? 'Pelo menos uma forma precisa ficar ligada.' : undefined}
                checked={on}
                disabled={locked}
                onChange={(checked) =>
                  save({
                    settings: { paymentMethods: { [method]: checked } },
                    message: `${PAYMENT_METHODS[method].label} ${checked ? 'ligado' : 'desligado'}`,
                  })
                }
                className={styles.methodSwitch}
              />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Aparência e acessibilidade deste aparelho (`usePreferences`): valem na hora. */
function AccessibilityCard() {
  const { preferences, setPreference } = usePreferences();
  return (
    <Card as="section" aria-labelledby="ajuste-acessibilidade" className={styles.card}>
      <SectionTitle
        id="ajuste-acessibilidade"
        icon={Accessibility}
        title="Aparência e acessibilidade"
        description="Valem só para este aparelho."
      />
      <div className={styles.group}>
        <p className={styles.groupLabel} aria-hidden="true">
          Cores da tela
        </p>
        <ChipGroup label="Cores da tela" wrap>
          {THEMES.map((theme) => (
            <Chip
              key={theme.value}
              icon={theme.icon}
              selected={preferences.theme === theme.value}
              onClick={() => setPreference('theme', theme.value)}
            >
              {theme.label}
            </Chip>
          ))}
        </ChipGroup>
      </div>
      <div className={styles.group}>
        <p className={styles.groupLabel} aria-hidden="true">
          Tamanho do texto
        </p>
        <ChipGroup label="Tamanho do texto" wrap>
          {FONT_SCALES.map((scale) => (
            <Chip
              key={scale.value}
              selected={preferences.fontScale === scale.value}
              onClick={() => setPreference('fontScale', scale.value)}
            >
              {scale.label}
            </Chip>
          ))}
        </ChipGroup>
        <p className={styles.sample} aria-hidden="true">
          Assim fica o texto: troco de <strong>R$ 12,50</strong>.
        </p>
      </div>
      <Switch
        label="Vibrar o celular"
        description="Uma vibração curta ao adicionar produto e ao concluir a venda."
        checked={preferences.vibration}
        onChange={(checked) => setPreference('vibration', checked)}
      />
      <Switch
        label='Botões "Ouvir"'
        description="O celular lê em voz alta o troco e os valores."
        checked={preferences.speech}
        onChange={(checked) => setPreference('speech', checked)}
      />
    </Card>
  );
}

/** Modo demonstração: simula internet lenta e falha (`configureApi`). */
function DemoCard() {
  const toast = useToast();
  const [api, setApi] = useState(getApiConfig);

  const change = (changes, message) => {
    configureApi(changes);
    setApi(getApiConfig());
    toast.show({ message, tone: 'info' });
  };

  return (
    <Card as="section" aria-labelledby="ajuste-demonstracao" className={styles.card}>
      <SectionTitle
        id="ajuste-demonstracao"
        icon={FlaskConical}
        title="Modo demonstração"
        description="Para ver como o app se comporta com internet ruim. Desligue aqui para voltar ao normal."
      />
      <Switch
        label="Simular internet lenta"
        description="Tudo demora de 1,5 a 3 segundos para responder."
        checked={api.slow}
        onChange={(checked) =>
          change({ slow: checked }, checked ? 'Internet lenta ligada' : 'Internet lenta desligada')
        }
      />
      <Switch
        label="Simular falha de internet"
        description="Tudo o que precisa da internet dá erro, para ver as mensagens e o “Tentar de novo”."
        checked={api.failing}
        onChange={(checked) =>
          change({ failing: checked }, checked ? 'Falha de internet ligada' : 'Falha de internet desligada')
        }
      />
    </Card>
  );
}

/** "Restaurar dados de exemplo": não tem volta, então pede confirmação. */
function ResetCard() {
  const { resetDemoData } = useSettings();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const reset = async () => {
    setPending(true);
    try {
      await resetDemoData();
      toast.show({ message: 'Dados de exemplo restaurados' });
      setConfirming(false);
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card as="section" aria-labelledby="ajuste-dados" className={styles.card}>
      <SectionTitle
        id="ajuste-dados"
        icon={DatabaseBackup}
        title="Dados de exemplo"
        description="Volta tudo para os dados da Barraca da Rosa: vendas, fiado, produtos, caixa e ajustes."
      />
      <Button
        variant="secondary"
        icon={RotateCcw}
        onClick={() => setConfirming(true)}
        className={styles.edit}
      >
        Restaurar dados de exemplo
      </Button>
      <Dialog
        open={confirming}
        onClose={() => !pending && setConfirming(false)}
        title="Restaurar os dados de exemplo?"
        description="Tudo o que você fez desde que entrou vai ser trocado pelos dados de exemplo. Isso não tem volta."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="danger" icon={RotateCcw} onClick={reset} loading={pending}>
              Restaurar
            </Button>
          </>
        }
      />
    </Card>
  );
}
