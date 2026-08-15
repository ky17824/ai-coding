export class ResearchDeadlineError extends Error {
  readonly code = "research_timeout";

  constructor() {
    super("research_timeout");
    this.name = "ResearchDeadlineError";
  }
}

export function stageTimeoutMs(input: {
  deadlineAt: number;
  stageCapMs: number;
  reserveMs: number;
  now?: number;
}) {
  const available = input.deadlineAt - (input.now ?? Date.now()) - input.reserveMs;
  if (available <= 0) throw new ResearchDeadlineError();
  return Math.min(input.stageCapMs, available);
}
