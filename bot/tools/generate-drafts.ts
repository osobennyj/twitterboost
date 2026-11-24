import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

const PostType = z.enum(["reply", "original", "thread_hook"]);
const Tone = z.enum(["analytical", "provocative", "educational", "alpha"]);

export default defineTool({
  description: "Генерирует 2-3 варианта драфта поста на основе анализа контента. Каждый вариант имеет разный угол или тон. Возвращает варианты для выбора пользователем.",
  effect: "read",
  inputSchema: z.object({
    topic: z.string().describe("Тема или суть контента"),
    postType: PostType.describe("Тип поста: reply, original, или thread_hook"),
    tone: Tone.optional().describe("Желаемый тон: analytical, provocative, educational, alpha"),
    keyFacts: z.array(z.string()).optional().describe("Ключевые факты для включения"),
    angle: z.string().optional().describe("Предложенный угол подачи"),
    maxLength: z.number().default(280).describe("Максимальная длина в символах"),
  }),
  async execute({ topic, postType, tone = "analytical", keyFacts = [], angle, maxLength }) {
    const drafts = generateDraftVariants(topic, postType, tone, keyFacts, angle, maxLength);

    return {
      drafts,
      metadata: {
        postType,
        tone,
        generatedAt: new Date().toISOString(),
        variants: drafts.length,
      },
      instructions: "Выбери номер варианта (1, 2, или 3) или попроси изменения",
    };
  },
});

type DraftVariant = {
  number: number;
  text: string;
  characterCount: number;
  style: string;
  withinLimit: boolean;
};

function generateDraftVariants(
  topic: string,
  postType: z.infer<typeof PostType>,
  tone: z.infer<typeof Tone>,
  keyFacts: string[],
  angle: string | undefined,
  maxLength: number
): DraftVariant[] {
  const templates = getTemplates(postType, tone);
  const facts = keyFacts.slice(0, 2).join(", ");

  const variants: DraftVariant[] = templates.slice(0, 3).map((template, index) => {
    const text = fillTemplate(template.template, {
      topic,
      facts,
      angle: angle || "ключевой инсайт",
    });

    return {
      number: index + 1,
      text: text.slice(0, maxLength),
      characterCount: Math.min(text.length, maxLength),
      style: template.style,
      withinLimit: text.length <= maxLength,
    };
  });

  return variants;
}

type Template = {
  template: string;
  style: string;
};

function getTemplates(
  postType: z.infer<typeof PostType>,
  tone: z.infer<typeof Tone>
): Template[] {
  const allTemplates: Record<string, Record<string, Template[]>> = {
    reply: {
      analytical: [
        { template: "Важный контекст: {topic}. Данные показывают {facts}.", style: "data-driven" },
        { template: "Это интересно в связи с {angle}. {facts} говорят о многом.", style: "contextual" },
        { template: "Добавлю: {topic} — это {angle}. Смотрим на {facts}.", style: "additive" },
      ],
      provocative: [
        { template: "Unpopular opinion: {topic} переоценен. {facts}.", style: "contrarian" },
        { template: "Все говорят о {topic}, но никто не смотрит на {facts}.", style: "revealing" },
        { template: "Hot take: {angle}. Почему? {facts}.", style: "bold" },
      ],
      educational: [
        { template: "Для контекста: {topic} работает так — {angle}.", style: "explainer" },
        { template: "Разберём {topic}: {facts}. Это важно потому что {angle}.", style: "breakdown" },
        { template: "ELI5: {topic} = {angle}. {facts}.", style: "simplified" },
      ],
      alpha: [
        { template: "Alpha на {topic}: {angle}. {facts} — ваш edge.", style: "insider" },
        { template: "Мало кто заметил: {topic} + {facts} = {angle}.", style: "hidden-gem" },
        { template: "Quick alpha: {topic}. Watch {facts}.", style: "actionable" },
      ],
    },
    original: {
      analytical: [
        { template: "{topic}\n\n{facts}\n\nЧто это значит: {angle}", style: "structured" },
        { template: "Наблюдение: {topic}\n\nДанные: {facts}\n\nВывод: {angle}", style: "observation" },
        { template: "{topic} — ключевые метрики:\n\n{facts}\n\n{angle}", style: "metrics-first" },
      ],
      provocative: [
        { template: "{topic} — и вот почему все ошибаются:\n\n{facts}", style: "contrarian-take" },
        { template: "Controversial: {topic}.\n\n{facts} говорят об обратном.", style: "debate-starter" },
        { template: "Мнение: {angle}\n\nПочему: {topic}, {facts}.", style: "opinion-piece" },
      ],
      educational: [
        { template: "Thread idea: {topic}\n\n{angle}\n\nОсновные факты: {facts}", style: "thread-tease" },
        { template: "{topic} 101:\n\n{angle}\n\n{facts}", style: "educational" },
        { template: "Простыми словами: {topic}\n\n{facts}\n\n{angle}", style: "eli5" },
      ],
      alpha: [
        { template: "🔍 {topic}\n\n{facts}\n\nAlpha: {angle}", style: "research" },
        { template: "Underrated: {topic}\n\n{angle}\n\nСмотрите на {facts}", style: "sleeper-pick" },
        { template: "{topic} alpha:\n\n{facts}\n\n{angle}\n\nNFA.", style: "nfa-alpha" },
      ],
    },
    thread_hook: {
      analytical: [
        { template: "🧵 {topic} — полный разбор.\n\n{facts}\n\nТред 👇", style: "breakdown-hook" },
        { template: "Давайте разберём {topic}.\n\n{angle}\n\n{facts}\n\n1/", style: "analytical-hook" },
        { template: "{topic}\n\nПочему это важно?\n\n{facts}\n\nТред:", style: "importance-hook" },
      ],
      provocative: [
        { template: "Controversial take на {topic}.\n\n{angle}\n\nОбъясняю почему 👇", style: "hot-take-hook" },
        { template: "Мнение, которое взорвёт ленту:\n\n{topic}\n\n{facts}\n\n🧵", style: "explosion-hook" },
        { template: "{topic} — и вот что все упустили.\n\nТред:", style: "reveal-hook" },
      ],
      educational: [
        { template: "Объясняю {topic} за 5 твитов.\n\n{angle}\n\n👇", style: "quick-explainer" },
        { template: "{topic} — гайд для начинающих.\n\n{facts}\n\n1/", style: "beginner-guide" },
        { template: "Всё что нужно знать о {topic}:\n\n{angle}\n\nТред 🧵", style: "comprehensive" },
      ],
      alpha: [
        { template: "Alpha тред: {topic}\n\n{facts}\n\nСохраняй 👇", style: "alpha-hook" },
        { template: "Research на {topic}.\n\n{angle}\n\nThread 🔍", style: "research-hook" },
        { template: "Нашёл кое-что интересное про {topic}.\n\n{facts}\n\n🧵", style: "discovery-hook" },
      ],
    },
  };

  return allTemplates[postType]?.[tone] || allTemplates.original.analytical;
}

function fillTemplate(
  template: string,
  vars: { topic: string; facts: string; angle: string }
): string {
  return template
    .replace(/{topic}/g, vars.topic)
    .replace(/{facts}/g, vars.facts || "данные в процессе")
    .replace(/{angle}/g, vars.angle);
}
