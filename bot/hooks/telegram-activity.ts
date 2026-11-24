import { defineHook } from "@grok/agent-sdk/hooks";

export default defineHook({
  events: {
    async "turn.completed"(event, ctx) {
      await ctx.host.kv.put("global:lastActivity", new Date().toISOString());

      const rawSubscribers = await ctx.host.kv.get("global:subscribers");
      const subscribers: number[] = [];
      if (Array.isArray(rawSubscribers)) {
        for (const item of rawSubscribers) {
          if (typeof item === "number") {
            subscribers.push(item);
          }
        }
      }
      
      const rawChatId = await ctx.host.kv.get(`session:${event.sessionId}:chatId`);
      const chatId = typeof rawChatId === "number" ? rawChatId : null;

      if (chatId && !subscribers.includes(chatId)) {
        subscribers.push(chatId);
        await ctx.host.kv.put("global:subscribers", subscribers);
      }
    },
  },
});
