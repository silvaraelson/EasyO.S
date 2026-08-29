import type { PaymentMethod, Priority, ServiceOrderStatus, UserRole } from "@easy-os/schemas";

export const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  draft: "Rascunho",
  open: "Aberta",
  scheduled: "Agendada",
  in_progress: "Em execução",
  paused: "Pausada",
  completed: "Concluída",
  invoiced: "Faturada",
  canceled: "Cancelada",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  manager: "Gestor",
  attendant: "Atendente",
  technician: "Técnico",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  bank_slip: "Boleto",
  invoice_on_file: "Faturado (a prazo)",
};

export function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
