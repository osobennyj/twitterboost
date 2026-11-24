import { defineChannel, publicEndpoint } from "@grok/agent-sdk/channels";
import * as z from "zod/v4";

const TelegramUpdate = z.object({
  update_id: z.number(),
  message: z.object({
    message_id: z.number(),
    from: z.object({
      id: z.number(),
      is_bot: z.boolean(),
      first_name: z.string(),
      username: z.string().optional(),
    }).optional(),
    chat: z.object({
      id: z.number(),
      type: z.enum(["private", "group", "supergroup", "channel"]),
    }),
    date: z.number(),
    text: z.string().optional(),
    photo: z.array(z.object({
      file_id: z.string(),
      file_unique_id: z.string(),
      width: z.number(),
      height: z.number(),
    })).optional(),
    caption: z.string().optional(),
  }).optional(),
});

type TelegramUpdateBody = z.infer<typeof TelegramUpdate>;

export default defineChannel({
  auth: [publicEndpoint()],

  routes: [
    {
      method: "POST",
      path: "/webhook",
      description: "Telegram Bot webhook for receiving messages",
      bodySchema: TelegramUpdate,

      async handler(_request, args) {
        const update = args.body as TelegramUpdateBody | undefined;

        if (!update?.message) {
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        const chatId = update.message.chat.id;
        const username = update.message.from?.username || "user";
        const text = update.message.text || update.message.caption || "";
        const hasPhoto = Boolean(update.message.photo?.length);

        if (text.startsWith("/start")) {
          await sendTelegramMessage(
            chatId,
            `Hey! I'm CT Content Agent 🧵\n\n` +
            `Send me:\n` +
            `• Links to trending crypto posts\n` +
            `• Screenshots of interesting content\n` +
            `• Trend or news descriptions\n\n` +
            `I'll analyze and offer 2-3 post variants in CT style.`
          );
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        if (text.startsWith("/help")) {
          await sendTelegramMessage(
            chatId,
            `📚 How to use the bot:\n\n` +
            `1. Send a tweet link or trend description\n` +
            `2. Get analysis and 2-3 post variants\n` +
            `3. Pick a number (1, 2, 3) or request changes\n` +
            `4. Copy the final version for posting`
          );
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        await sendTypingAction(chatId);
        
        await sendTelegramMessage(
          chatId,
          `🔄 Got it! Analyzing your content and preparing draft options...\n\nThis usually takes 10-30 seconds.`
        );

        const userMessage = hasPhoto
          ? `[Screenshot from @${username}] ${text || "No description"}`
          : text;

        await args.host.kv.put(`telegram:chat:${chatId}`, { chatId, username });

        const session = await args.send(userMessage);

        await args.host.kv.put(`session:${session.id}:chatId`, chatId);

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    },
  ],

  events: {
    async "turn.completed"(event, _channel, ctx) {
      const chatId = await ctx.host.kv.get(`session:${event.sessionId}:chatId`);
      if (!chatId || typeof chatId !== "number") return;

      const response = event.data.result;
      if (response) {
        await sendTelegramMessage(chatId, response);
      }
    },
  },
});

async function sendTypingAction(chatId: number): Promise<void> {
  const botToken = process.env.CT_TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        action: "typing",
      }),
    });
  } catch (error) {
    console.error("Failed to send typing action:", error);
  }
}

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const botToken = process.env.CT_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("CT_TELEGRAM_BOT_TOKEN not set");
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4096),
      }),
    });
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
}
