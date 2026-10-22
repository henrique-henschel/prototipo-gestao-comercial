import { createContext } from 'react';

/**
 * @typedef {'success'|'info'|'warning'|'danger'} ToastTone
 *
 * @typedef {object} ToastOptions
 * @property {string} message texto principal, curto ("Venda registrada")
 * @property {string} [description] detalhe opcional ("R$ 25,00 em dinheiro")
 * @property {ToastTone} [tone='success']
 * @property {{ label: string, onClick: () => void }} [action] ex.: "Desfazer"
 * @property {number} [duration] em ms; padrão 5 s (8 s quando há ação)
 *
 * @typedef {object} ToastApi
 * @property {(options: ToastOptions) => string} show devolve o id do aviso
 * @property {(id: string) => void} dismiss
 */

/** @type {import('react').Context<ToastApi | null>} */
export const ToastContext = createContext(null);
