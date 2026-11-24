import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";

const ContentType = z.enum(["tweet", "thread", "news", "chart", "screenshot", "other"]);
const Topic = z.enum(["defi", "trading", "narrative", "technology", "macro", "nft", "gaming", "other"]);

export default defineTool({
  description: "Анализирует входящий крипто-контент (ссылка, скриншот, описание). Извлекает ключевые факты, определяет тему и предлагает угол для поста. Вызывай первым при получении любого контента от пользователя.",
  effect: "read",
  inputSchema: z.object({
    content: z.string().describe("Текст, ссылка или описание контента для анализа"),
    contentType: ContentType.optional().describe("Тип контента если известен"),
  }),
  async execute({ content, contentType }) {
    const detectedType = contentType || detectContentType(content);
    const topics = detectTopics(content);
    const keyFacts = extractKeyFacts(content);
    const sentiment = analyzeSentiment(content);
    const suggestedAngles = generateAngles(content, topics, sentiment);

    return {
      analysis: {
        detectedType,
        topics,
        keyFacts,
        sentiment,
        suggestedAngles,
        characterCount: content.length,
        hasNumbers: /\d+/.test(content),
        hasTicker: /\$[A-Z]{2,10}/.test(content),
      },
      recommendation: suggestedAngles[0] || "Создать аналитический пост с инсайтом",
    };
  },
});

function detectContentType(content: string): z.infer<typeof ContentType> {
  if (content.includes("twitter.com") || content.includes("x.com")) return "tweet";
  if (content.includes("http") && (content.includes("chart") || content.includes("tradingview"))) return "chart";
  if (content.length > 1000) return "thread";
  if (/breaking|news|announced/i.test(content)) return "news";
  return "other";
}

function detectTopics(content: string): z.infer<typeof Topic>[] {
  const topics: z.infer<typeof Topic>[] = [];
  const lowerContent = content.toLowerCase();

  if (/defi|tvl|yield|apy|liquidity|pool|swap|amm|lending/i.test(lowerContent)) topics.push("defi");
  if (/trade|long|short|leverage|liquidat|ta|chart|support|resistance/i.test(lowerContent)) topics.push("trading");
  if (/narrative|trend|hype|meta|rotation|cycle/i.test(lowerContent)) topics.push("narrative");
  if (/l1|l2|layer|chain|protocol|smart contract|zk|rollup/i.test(lowerContent)) topics.push("technology");
  if (/fed|regulation|sec|etf|institution|macro|inflation/i.test(lowerContent)) topics.push("macro");
  if (/nft|pfp|collection|mint|floor/i.test(lowerContent)) topics.push("nft");
  if (/game|gaming|play.to.earn|metaverse/i.test(lowerContent)) topics.push("gaming");

  return topics.length > 0 ? topics : ["other"];
}

function extractKeyFacts(content: string): string[] {
  const facts: string[] = [];
  
  const percentages = content.match(/\d+\.?\d*%/g);
  if (percentages) facts.push(...percentages.map(p => `Процентное изменение: ${p}`));

  const amounts = content.match(/\$\d+(?:\.\d+)?(?:M|B|K)?/gi);
  if (amounts) facts.push(...amounts.map(a => `Сумма: ${a}`));

  const tickers = content.match(/\$[A-Z]{2,10}/g);
  if (tickers) facts.push(`Упомянутые тикеры: ${[...new Set(tickers)].join(", ")}`);

  return facts.slice(0, 5);
}

function analyzeSentiment(content: string): "bullish" | "bearish" | "neutral" {
  const bullishWords = /bullish|pump|moon|ath|breakout|accumulate|buy|long|rally/gi;
  const bearishWords = /bearish|dump|crash|liquidat|sell|short|correction|fear/gi;

  const bullishCount = (content.match(bullishWords) || []).length;
  const bearishCount = (content.match(bearishWords) || []).length;

  if (bullishCount > bearishCount + 1) return "bullish";
  if (bearishCount > bullishCount + 1) return "bearish";
  return "neutral";
}

function generateAngles(
  content: string,
  topics: z.infer<typeof Topic>[],
  sentiment: string
): string[] {
  const angles: string[] = [];

  if (topics.includes("defi")) {
    angles.push("Разбор доходности и рисков протокола");
    angles.push("Сравнение с конкурентами по TVL/APY");
  }

  if (topics.includes("trading")) {
    angles.push("Технический анализ с ключевыми уровнями");
    angles.push("Risk/reward сетапа");
  }

  if (topics.includes("narrative")) {
    angles.push("Почему этот нарратив набирает силу");
    angles.push("Исторические параллели с прошлыми циклами");
  }

  if (topics.includes("technology")) {
    angles.push("Техническое преимущество решения");
    angles.push("Adoption метрики и traction");
  }

  if (topics.includes("macro")) {
    angles.push("Влияние на крипто-рынок");
    angles.push("Что это значит для retail/институционалов");
  }

  if (sentiment === "bullish") {
    angles.push("Контрарианский взгляд: риски при бычьем сентименте");
  } else if (sentiment === "bearish") {
    angles.push("Поиск возможностей в страхе");
  }

  return angles.slice(0, 3);
}
