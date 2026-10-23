import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  FileSpreadsheet,
  MessageCircle,
  PackagePlus,
  Printer,
  RotateCcw,
  Share2,
  ShoppingCart,
} from 'lucide-react';
import { ROUTES } from '@/app/routes.js';
import { PageHeader } from '@/components/layout';
import { Button, Card, Chip, ChipGroup, EmptyState, Input, Skeleton } from '@/components/ui';
import { PERIOD_PRESETS, REPORT_TYPES } from '@/domain/constants.js';
import { useSettings } from '@/hooks/useSettings.js';
import { useToast } from '@/hooks/useToast.js';
import { buildCsv, downloadCsv } from '@/lib/csv.js';
import { cx } from '@/lib/cx.js';
import { dateOf, today as todayISO } from '@/lib/date.js';
import { formatPeriod } from '@/lib/format.js';
import { canShareNatively, shareText } from '@/lib/share.js';
import { ReportPreview } from '../components/ReportPreview.jsx';
import { CUSTOM_PERIOD, nextReportParams, readReportFilters } from '../reportFilters.js';
import { isReportEmpty, reportSections } from '../reportTables.js';
import {
  SNAPSHOT_REPORTS,
  reportIssuedText,
  reportPeriodText,
  reportSummaryText,
  reportTitle,
} from '../reportText.js';
import { useReport } from '../useReport.js';
import styles from './ReportsPage.module.css';

/** Para o PDF: os "Ver os números" dos gráficos abrem na impressão e voltam depois. */
function useOpenDetailsWhilePrinting(ref) {
  useEffect(() => {
    let opened = [];
    const open = () => {
      opened = [...(ref.current?.querySelectorAll('details:not([open])') ?? [])];
      opened.forEach((details) => {
        details.open = true;
      });
    };
    const close = () => {
      opened.forEach((details) => {
        details.open = false;
      });
      opened = [];
    };
    window.addEventListener('beforeprint', open);
    window.addEventListener('afterprint', close);
    return () => {
      window.removeEventListener('beforeprint', open);
      window.removeEventListener('afterprint', close);
    };
  }, [ref]);
}

/** "relatorio-vendas-2026-10-01-a-2026-10-23" (fiado e estoque: só o dia de hoje). */
function reportFileName(report) {
  const { start, end } = report.period;
  const days = SNAPSHOT_REPORTS.includes(report.type)
    ? dateOf(report.generatedAt)
    : start === end
      ? start
      : `${start}-a-${end}`;
  return `relatorio-${report.type}-${days}`;
}

/**
 * Relatórios: escolha do tipo e do período (guardados na barra de endereço), prévia na
 * tela e as três formas de levar: planilha do Excel (CSV, a ação principal), PDF pela
 * impressão (com o cabeçalho do negócio) e o resumo em texto no WhatsApp. Regra 8.
 */
export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const { business } = useSettings();
  const toast = useToast();
  const previewRef = useRef(null);
  const today = todayISO();

  const filters = readReportFilters(params, today);
  const { status, report, retry } = useReport(filters.type, filters.period);
  const isSnapshot = SNAPSHOT_REPORTS.includes(filters.type);
  // O relatório na tela é o dos filtros atuais (o anterior fica até o próximo chegar).
  const isCurrent = report?.type === filters.type;
  const empty = report ? isReportEmpty(report) : true;
  const canExport = Boolean(report) && status === 'ready' && !empty;
  const businessName = business?.name ?? '';

  useOpenDetailsWhilePrinting(previewRef);

  const change = (changes) => setParams(nextReportParams(params, changes, today), { replace: true });

  const exportCsv = () => {
    const csv = buildCsv(reportSections(report), {
      header: [
        businessName,
        `Relatório: ${reportTitle(report.type)}`,
        reportPeriodText(report),
        reportIssuedText(report),
      ].filter(Boolean),
    });
    downloadCsv(`${reportFileName(report)}.csv`, csv);
    toast.show({
      message: 'Planilha baixada',
      description: 'Abra o arquivo no Excel ou no app de planilhas.',
    });
  };

  const print = () => {
    const title = document.title;
    const restore = () => {
      document.title = title;
      window.removeEventListener('afterprint', restore);
    };
    // O nome do PDF salvo vem do título da página.
    document.title = reportFileName(report);
    window.addEventListener('afterprint', restore);
    window.print();
  };

  const share = async () => {
    const result = await shareText({
      title: `${reportTitle(report.type)} · ${businessName}`,
      text: reportSummaryText(report, { businessName }),
    });
    if (result === 'whatsapp') toast.show({ message: 'Abrimos o WhatsApp com o resumo', tone: 'info' });
  };

  const nativeShare = canShareNatively();
  const typeTitle = reportTitle(filters.type);
  const presetLabel = PERIOD_PRESETS.find((option) => option.value === filters.preset)?.label;

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Relatórios"
          description="Veja os números do seu negócio e leve para o Excel, o PDF ou o WhatsApp."
        />
      </div>

      {report && (
        <header className={cx(styles.printHeader, 'print-only')}>
          {businessName && <p className={styles.printBusiness}>{businessName}</p>}
          <p className={styles.printTitle}>Relatório: {reportTitle(report.type)}</p>
          <p>{reportPeriodText(report)}</p>
          <p>{reportIssuedText(report)}</p>
        </header>
      )}

      <div className={cx(styles.controls, 'no-print')}>
        <Card className={styles.filters}>
          <div className={styles.group}>
            <p className={styles.groupLabel} aria-hidden="true">
              Qual relatório?
            </p>
            <ChipGroup label="Qual relatório?" wrap>
              {REPORT_TYPES.map((option) => (
                <Chip
                  key={option.value}
                  selected={option.value === filters.type}
                  onClick={() => change({ type: option.value })}
                >
                  {option.label}
                </Chip>
              ))}
            </ChipGroup>
          </div>

          <div className={styles.group}>
            <p className={styles.groupLabel} aria-hidden="true">
              De quando?
            </p>
            {isSnapshot ? (
              <p className={styles.muted}>Este relatório mostra como está agora, então não tem período.</p>
            ) : (
              <>
                <ChipGroup label="De quando?" wrap>
                  {PERIOD_PRESETS.map((option) => (
                    <Chip
                      key={option.value}
                      selected={option.value === filters.preset}
                      onClick={() => change({ preset: option.value })}
                    >
                      {option.label}
                    </Chip>
                  ))}
                </ChipGroup>
                {filters.preset === CUSTOM_PERIOD && (
                  <div className={styles.dates}>
                    <Input
                      type="date"
                      label="Do dia"
                      value={filters.from}
                      max={today}
                      onChange={(event) => change({ from: event.target.value })}
                    />
                    <Input
                      type="date"
                      label="Até o dia"
                      value={filters.to}
                      max={today}
                      onChange={(event) => change({ to: event.target.value })}
                      error={filters.period ? undefined : 'Escolha as duas datas, até hoje.'}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        <Card as="section" aria-labelledby="levar" className={styles.exports}>
          <h2 id="levar" className={styles.cardTitle}>
            Levar este relatório
          </h2>
          <div className={styles.actions}>
            <Button size="lg" icon={FileSpreadsheet} onClick={exportCsv} disabled={!canExport} fullWidth>
              Baixar para o Excel
            </Button>
            <Button variant="secondary" icon={Printer} onClick={print} disabled={!canExport} fullWidth>
              Imprimir ou salvar em PDF
            </Button>
            <Button
              variant="secondary"
              icon={nativeShare ? Share2 : MessageCircle}
              onClick={share}
              disabled={!canExport}
              fullWidth
            >
              {nativeShare ? 'Enviar resumo' : 'Enviar resumo no WhatsApp'}
            </Button>
          </div>
          {report && status === 'ready' && empty && (
            <p className={styles.muted}>Nada para levar: este relatório está vazio.</p>
          )}
        </Card>
      </div>

      <section
        ref={previewRef}
        aria-labelledby="previa"
        aria-busy={status === 'loading' || undefined}
        className={cx(styles.preview, status === 'loading' && report && styles.stale)}
      >
        <header className={cx(styles.previewHeader, 'no-print')}>
          <h2 id="previa" className={styles.previewTitle}>
            {typeTitle}
          </h2>
          <p className={styles.muted} aria-live="polite">
            {isSnapshot
              ? `Como está agora, ${formatPeriod({ start: today, end: today })}`
              : filters.period
                ? `${presetLabel}: ${formatPeriod(filters.period)}`
                : 'Escolha as datas acima.'}
          </p>
        </header>

        <PreviewBody
          status={status}
          report={isCurrent ? report : null}
          empty={empty}
          onRetry={retry}
          hasPeriod={Boolean(filters.period)}
        />
      </section>
    </>
  );
}

function PreviewBody({ status, report, empty, onRetry, hasPeriod }) {
  if (!hasPeriod) return null;

  if (status === 'error') {
    return (
      <Card>
        <EmptyState
          tone="danger"
          emoji="📡"
          title="Não deu para montar o relatório"
          description="Confira a internet e tente de novo."
          action={
            <Button icon={RotateCcw} onClick={onRetry}>
              Tentar de novo
            </Button>
          }
        />
      </Card>
    );
  }

  if (!report) {
    return (
      <div className={styles.loading} aria-label="Carregando o relatório">
        <div className={styles.loadingStats}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} shape="rect" height="6rem" />
          ))}
        </div>
        <Skeleton shape="rect" height="16rem" />
      </div>
    );
  }

  if (empty) return <EmptyReport type={report.type} />;

  return <ReportPreview report={report} />;
}

/** Vazio que ensina o próximo passo, conforme o relatório. */
function EmptyReport({ type }) {
  if (type === 'fiado') {
    return (
      <Card>
        <EmptyState
          emoji="🎉"
          title="Ninguém está devendo"
          description="Quando alguém comprar fiado, aparece aqui quanto deve e quando vence."
        />
      </Card>
    );
  }
  if (type === 'estoque') {
    return (
      <Card>
        <EmptyState
          emoji="📦"
          title="Nenhum produto cadastrado"
          description="Cadastre o que você vende para ver aqui o que tem, o que está acabando e quanto vale."
          action={
            <Button as={Link} to={ROUTES.newProduct} icon={PackagePlus} variant="secondary">
              Cadastrar produto
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <Card>
      <EmptyState
        emoji="📭"
        title={type === 'caixa' ? 'Nada no caixa nesse período' : 'Nenhuma venda nesse período'}
        description="Escolha outro período acima. Quando você vender, os números aparecem aqui."
        action={
          <Button as={Link} to={ROUTES.sell} icon={ShoppingCart} variant="secondary">
            Fazer uma venda
          </Button>
        }
      />
    </Card>
  );
}
