import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import { serviceOrders, user } from "../db/schema.js";
import { sendPushNotification } from "./push.js";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 min
const REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000; // avisa até 2h antes do horário agendado

/**
 * Roda dentro do próprio processo da API (sem dependência externa de cron) —
 * varre OS agendadas para as próximas 2h que ainda não tiveram lembrete
 * enviado e notifica o técnico responsável. Só funciona enquanto o processo
 * está de pé; no plano free do Render, que dorme por inatividade, o
 * lembrete não dispara nesse período — é uma limitação aceita do free tier.
 */
export function startReminderScheduler() {
  async function checkReminders() {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

    const due = await db
      .select({
        id: serviceOrders.id,
        number: serviceOrders.number,
        scheduledAt: serviceOrders.scheduledAt,
        assignedTechnicianId: serviceOrders.assignedTechnicianId,
        pushToken: user.pushToken,
      })
      .from(serviceOrders)
      .innerJoin(user, eq(serviceOrders.assignedTechnicianId, user.id))
      .where(
        and(
          eq(serviceOrders.status, "scheduled"),
          isNull(serviceOrders.reminderSentAt),
          gte(serviceOrders.scheduledAt, now),
          lte(serviceOrders.scheduledAt, windowEnd),
        ),
      );

    for (const order of due) {
      if (order.pushToken) {
        const when = order.scheduledAt
          ? new Date(order.scheduledAt).toLocaleString("pt-BR")
          : "";
        await sendPushNotification(order.pushToken, {
          title: `Lembrete — OS #${order.number}`,
          body: when ? `Agendada para ${when}` : "Confira os detalhes no app",
          data: { serviceOrderId: order.id },
        });
      }
      await db
        .update(serviceOrders)
        .set({ reminderSentAt: now })
        .where(eq(serviceOrders.id, order.id));
    }
  }

  checkReminders().catch((error) => console.error("Falha ao checar lembretes:", error));
  setInterval(() => {
    checkReminders().catch((error) => console.error("Falha ao checar lembretes:", error));
  }, CHECK_INTERVAL_MS);
}
