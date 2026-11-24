import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  model: {
    id: "claude-sonnet-4-5",
  },
  local: {
    cwd: undefined,
  },
});
