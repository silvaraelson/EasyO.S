/**
 * Notificações push via serviço da Expo — não precisa de conta/credenciais
 * próprias no backend, só de um token de dispositivo válido (gerado pelo
 * app mobile com um EAS project id). https://docs.expo.dev/push-notifications/
 */
export async function sendPushNotification(
  token: string,
  message: { title: string; body: string; data?: Record<string, unknown> },
): Promise<void> {
  if (!token.startsWith("ExponentPushToken")) return;

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: token,
        title: message.title,
        body: message.body,
        data: message.data,
      }),
    });
  } catch {
    // Notificação é best-effort — nunca deve quebrar o fluxo principal da OS.
  }
}
