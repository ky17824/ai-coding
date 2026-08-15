import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./015_market_research_attempt_lifecycle.sql", import.meta.url), "utf8");

describe("market research attempt lifecycle migration", () => {
  it("reserves, completes, and fails attempts atomically", () => {
    expect(source).toContain("market_research_active_attempt_id");
    expect(source).toContain("market_research_failure_count");
    expect(source).toContain("reserve_market_research_attempt");
    expect(source).toContain("complete_market_research_attempt");
    expect(source).toContain("fail_market_research_attempt");
    expect(source).toContain("interval '6 minutes'");
    expect(source).toContain("interval '24 hours'");
    expect(source).toContain("market_research_count + 1");
  });

  it("keeps lifecycle functions service-role only", () => {
    expect(source.match(/revoke all on function public\.(?:reserve|complete|fail)_market_research_attempt/g)).toHaveLength(3);
    expect(source.match(/grant execute on function public\.(?:reserve|complete|fail)_market_research_attempt/g)).toHaveLength(3);
  });
});
