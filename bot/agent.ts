import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  model: {
    id: "claude-sonnet-4-20250514",
  },
  local: {
    cwd: undefined,
  },
});
