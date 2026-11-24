import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  description: "Smoke test: анализ тренда и генерация драфтов",

  cases: [
    {
      id: "eth-trend-analysis",
      async test(t) {
        await t.send("Вот тренд: ETH флипнул BTC по активности L2. Сделай пост.");
        t.succeeded();
        t.calledTool("analyze_content");
        t.calledTool("generate_drafts");
      },
    },
    {
      id: "defi-tvl-post",
      async test(t) {
        await t.send("Новость: TVL Arbitrum достиг $10B, рост 50% за месяц. Нужен аналитический пост.");
        t.succeeded();
        t.calledTool("analyze_content");
        t.calledTool("generate_drafts");
      },
    },
    {
      id: "thread-request",
      async test(t) {
        await t.send("Сделай тред про ZK rollups vs Optimistic rollups. Образовательный формат.");
        t.succeeded();
        t.calledTool("format_thread");
      },
    },
  ],
});
