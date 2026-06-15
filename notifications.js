export const TELEGRAM_CONFIG = {
  botToken: "YOUR_BOT_TOKEN_HERE",
  chatId: "YOUR_CHAT_ID_HERE"
};

/**
 * Sends a Telegram notification to the shop owner.
 * Gracefully handles missing or placeholder tokens by logging the message cleanly to console.
 * @param {string} message 
 */
export async function sendTelegramNotification(message) {
  const isPlaceholder = 
    !TELEGRAM_CONFIG.botToken || 
    TELEGRAM_CONFIG.botToken.includes("YOUR_BOT_TOKEN_HERE") ||
    !TELEGRAM_CONFIG.chatId ||
    TELEGRAM_CONFIG.chatId.includes("YOUR_CHAT_ID_HERE");

  if (isPlaceholder) {
    console.log("\n=================== TELEGRAM NOTIFICATION ===================");
    console.log(message);
    console.log("============================================================\n");
    return { success: true, mode: "logged" };
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CONFIG.chatId,
        text: message,
        parse_mode: "HTML"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Telegram] API error: ${response.status} - ${errText}`);
      return { success: false, error: errText };
    }

    console.log("[Telegram] Notification sent successfully via real Bot API.");
    return { success: true, mode: "api" };
  } catch (error) {
    console.error("[Telegram] Network error sending notification:", error);
    return { success: false, error: error.message };
  }
}
