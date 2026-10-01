// Telegram bot and Discord webhook messaging.

async function telegramCall(token, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) throw new Error(json.description || `Telegram ${method} failed (${res.status})`);
  return json.result;
}

function sendTelegram({ token, chatId }, text) {
  if (!token || !chatId) return Promise.reject(new Error('Telegram token and chat ID are required'));
  return telegramCall(token, 'sendMessage', { chat_id: chatId, text, disable_web_page_preview: true });
}

// Finds the chat ID of whoever last messaged the bot.
async function findTelegramChatId(token) {
  const updates = await telegramCall(token, 'getUpdates', {});
  for (let i = updates.length - 1; i >= 0; i--) {
    const msg = updates[i].message || updates[i].channel_post || updates[i].my_chat_member;
    if (msg && msg.chat) return { id: String(msg.chat.id), name: msg.chat.title || msg.chat.username || msg.chat.first_name || '' };
  }
  throw new Error('No messages yet. Send any message to your bot, then try again.');
}

async function sendDiscord(webhookUrl, content) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, username: 'StudyForce' })
  });
  if (!res.ok) throw new Error(`Discord webhook failed (${res.status})`);
}

// Posts to every accountability channel that is configured.
async function postPublic(settings, text) {
  const jobs = [];
  const tg = settings.telegram;
  if (tg.token && (tg.channelId || tg.chatId)) jobs.push(sendTelegram({ token: tg.token, chatId: tg.channelId || tg.chatId }, text));
  if (settings.discordWebhook) jobs.push(sendDiscord(settings.discordWebhook, text));
  const results = await Promise.allSettled(jobs);
  return results.filter((r) => r.status === 'rejected').map((r) => r.reason.message);
}

function progressText(snap) {
  const lines = snap.tracks.map((t) => {
    const mark = t.left === 0 ? '✅' : t.doneToday === 0 ? '❌' : '🟡';
    return `${mark} ${t.name}: ${t.doneToday}/${t.quota}`;
  });
  return [`📊 StudyForce — Day ${snap.dayNumber} (${snap.today})`, ...lines, `🔥 Streak: ${snap.streak}`].join('\n');
}

module.exports = { sendTelegram, findTelegramChatId, sendDiscord, postPublic, progressText };
