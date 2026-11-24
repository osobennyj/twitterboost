import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

export default defineTool({
  description: "Форматирует контент в Twitter-тред (серия связанных твитов). Разбивает длинный контент на части по 280 символов. Добавляет нумерацию и связность между частями.",
  effect: "read",
  inputSchema: z.object({
    content: z.string().describe("Полный контент для форматирования в тред"),
    maxTweets: z.number().default(10).describe("Максимальное количество твитов в треде"),
    style: z.enum(["numbered", "emoji", "minimal"]).default("numbered").describe("Стиль нумерации"),
    hookText: z.string().optional().describe("Кастомный текст для первого (hook) твита"),
  }),
  async execute({ content, maxTweets, style, hookText }) {
    const thread = formatThread(content, maxTweets, style, hookText);

    return {
      thread,
      metadata: {
        totalTweets: thread.length,
        totalCharacters: thread.reduce((sum, t) => sum + t.text.length, 0),
        style,
        allWithinLimit: thread.every(t => t.withinLimit),
      },
      preview: thread.map(t => `[${t.number}] ${t.text.slice(0, 50)}...`).join("\n"),
    };
  },
});

type ThreadTweet = {
  number: number;
  text: string;
  characterCount: number;
  withinLimit: boolean;
  isHook: boolean;
  isCta: boolean;
};

function formatThread(
  content: string,
  maxTweets: number,
  style: "numbered" | "emoji" | "minimal",
  hookText?: string
): ThreadTweet[] {
  const maxLength = 280;
  const thread: ThreadTweet[] = [];

  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

  if (hookText) {
    thread.push(createTweet(1, hookText, style, true, false));
  }

  let currentTweet = "";
  let tweetNumber = hookText ? 2 : 1;

  for (const paragraph of paragraphs) {
    if (thread.length >= maxTweets - 1) break;

    const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      const prefix = getPrefix(tweetNumber, style);
      const potentialLength = currentTweet
        ? currentTweet.length + 1 + trimmedSentence.length
        : prefix.length + trimmedSentence.length;

      if (potentialLength <= maxLength - 5) {
        currentTweet = currentTweet
          ? `${currentTweet} ${trimmedSentence}`
          : trimmedSentence;
      } else {
        if (currentTweet) {
          thread.push(createTweet(tweetNumber, currentTweet, style, tweetNumber === 1, false));
          tweetNumber++;
        }
        currentTweet = trimmedSentence;
      }
    }
  }

  if (currentTweet && thread.length < maxTweets) {
    thread.push(createTweet(tweetNumber, currentTweet, style, false, false));
    tweetNumber++;
  }

  if (thread.length < maxTweets) {
    const ctaText = getCta(style);
    thread.push(createTweet(tweetNumber, ctaText, style, false, true));
  }

  return thread;
}

function createTweet(
  number: number,
  text: string,
  style: "numbered" | "emoji" | "minimal",
  isHook: boolean,
  isCta: boolean
): ThreadTweet {
  const prefix = isHook ? "" : getPrefix(number, style);
  const fullText = prefix ? `${prefix} ${text}` : text;

  return {
    number,
    text: fullText.slice(0, 280),
    characterCount: Math.min(fullText.length, 280),
    withinLimit: fullText.length <= 280,
    isHook,
    isCta,
  };
}

function getPrefix(number: number, style: "numbered" | "emoji" | "minimal"): string {
  switch (style) {
    case "numbered":
      return `${number}/`;
    case "emoji":
      const emojis = ["🧵", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      return emojis[number] || `${number}/`;
    case "minimal":
      return "";
    default:
      return `${number}/`;
  }
}

function getCta(style: "numbered" | "emoji" | "minimal"): string {
  const ctas = [
    "Если полезно — RT первый твит. Вопросы в реплаи 👇",
    "Понравилось? Подписывайся на больше alpha. RT appreciated 🙏",
    "Это было полезно? Like + RT помогут распространить.",
  ];

  if (style === "emoji") {
    return "🔄 RT если полезно | 💬 Вопросы в реплаи | ➕ Follow для alpha";
  }

  return ctas[Math.floor(Math.random() * ctas.length)];
}
