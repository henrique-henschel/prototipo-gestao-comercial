import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Clock,
  PackageCheck,
  PackageMinus,
  PackageX,
  TriangleAlert,
} from 'lucide-react';

/**
 * Tradução visual dos status de domínio (ver docs/regras-de-negocio.md):
 * cada status tem tom, ícone e texto, para que a cor nunca carregue o significado sozinha.
 * As chaves espelham os valores calculados em `domain/rules` (fiado, estoque, venda).
 */
export const STATUS_PRESETS = {
  // Fiado
  quitado: { tone: 'success', icon: CircleCheck, label: 'Pago' },
  em_dia: { tone: 'neutral', icon: CircleDot, label: 'Em dia' },
  vence_em_breve: { tone: 'warning', icon: Clock, label: 'Vence logo' },
  vence_hoje: { tone: 'warning', icon: TriangleAlert, label: 'Vence hoje' },
  atrasado: { tone: 'danger', icon: CircleAlert, label: 'Atrasado' },
  bloqueado: { tone: 'danger', icon: Ban, label: 'Sem fiado' },
  // Estoque
  ok: { tone: 'success', icon: PackageCheck, label: 'Tem estoque' },
  acabando: { tone: 'warning', icon: PackageMinus, label: 'Acabando' },
  acabou: { tone: 'danger', icon: PackageX, label: 'Acabou' },
  // Venda
  concluida: { tone: 'success', icon: CircleCheck, label: 'Concluída' },
  cancelada: { tone: 'neutral', icon: Ban, label: 'Cancelada' },
};
