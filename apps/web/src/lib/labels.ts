import type { Priority, ServiceOrderStatus, UserRole } from "@easy-os/schemas";

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
