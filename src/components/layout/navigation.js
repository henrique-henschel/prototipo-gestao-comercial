import {
  ChartColumn,
  CircleQuestionMark,
  House,
  LayoutGrid,
  NotebookText,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '@/app/routes.js';

/**
 * Itens de navegação. A mesma lista alimenta a barra lateral (computador), a barra
 * de baixo (celular) e a tela "Mais", para que os nomes e ícones sejam sempre iguais.
 *
 * @typedef {object} NavItem
 * @property {string} to
 * @property {string} label nome curto, do dia a dia
 * @property {string} [description] usado na tela "Mais"
 * @property {import('react').ComponentType<any>} icon
 */

/** @type {Record<string, NavItem>} */
export const NAV = {
  home: { to: ROUTES.home, label: 'Início', icon: House },
  sell: { to: ROUTES.sell, label: 'Vender', icon: ShoppingCart },
  sales: {
    to: ROUTES.sales,
    label: 'Vendas',
    description: 'Ver, procurar e cancelar vendas',
    icon: ShoppingBag,
  },
  fiado: { to: ROUTES.fiado, label: 'Fiado', description: 'Quem me deve e quanto', icon: NotebookText },
  customers: {
    to: ROUTES.customers,
    label: 'Clientes',
    description: 'Cadastro e limite do fiado',
    icon: Users,
  },
  inventory: { to: ROUTES.inventory, label: 'Estoque', description: 'Produtos e mercadoria', icon: Package },
  cash: {
    to: ROUTES.cash,
    label: 'Caixa do dia',
    description: 'Entradas, despesas e fechar o dia',
    icon: Wallet,
  },
  reports: { to: ROUTES.reports, label: 'Relatórios', description: 'Resumo, Excel e PDF', icon: ChartColumn },
  settings: {
    to: ROUTES.settings,
    label: 'Ajustes',
    description: 'Negócio, Pix, taxas e letra',
    icon: Settings,
  },
  help: { to: ROUTES.help, label: 'Ajuda', description: 'Dúvidas e passo a passo', icon: CircleQuestionMark },
  more: { to: ROUTES.more, label: 'Mais', icon: LayoutGrid },
};

/** Barra lateral: a área de trabalho, depois o que é de apoio. */
export const SIDEBAR_MAIN = [
  NAV.home,
  NAV.sales,
  NAV.fiado,
  NAV.customers,
  NAV.inventory,
  NAV.cash,
  NAV.reports,
];
export const SIDEBAR_FOOTER = [NAV.settings, NAV.help];

/** Barra de baixo do celular: 5 itens, com "Vender" no centro. */
export const BOTTOM_NAV = [NAV.home, NAV.fiado, NAV.sell, NAV.inventory, NAV.more];

/** Telas que ficam dentro de "Mais" no celular. */
export const MORE_ITEMS = [NAV.sales, NAV.customers, NAV.cash, NAV.reports, NAV.settings, NAV.help];
