import { zodTextFormat } from "openai/helpers/zod";
import { makeParseableTextFormat } from "openai/lib/parser";
import { z } from "zod";

type StringTooBig = z.core.$ZodIssue & { code: "too_big"; origin: "string"; maximum: number };

function isStringTooBig(issue: z.core.$ZodIssue): issue is StringTooBig {
  return issue.code === "too_big" && "origin" in issue && issue.origin === "string" && typeof issue.maximum === "number";
}

/**
 * Parse model output, truncating strings that exceed a zod `.max()` instead of failing.
 * OpenAI structured outputs do not enforce `maxLength`, so a 520-character answer in a
 * `.max(500)` field would otherwise sink an entire multi-minute research run.
 */
export function parseTruncatingStrings<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  let value = raw;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    const fixable = result.error.issues.filter(isStringTooBig);
    if (fixable.length === 0) throw result.error;
    value = structuredClone(value);
    for (const issue of fixable) {
      const parent = issue.path.slice(0, -1).reduce<any>((node, key) => node?.[key as string], value);
      const key = issue.path[issue.path.length - 1] as string;
      if (parent && typeof parent[key] === "string") parent[key] = parent[key].slice(0, issue.maximum);
    }
  }
  throw new Error("string truncation did not converge");
}

/** Drop-in for `zodTextFormat` whose parser tolerates over-long strings. */
export function lenientZodTextFormat<T extends z.ZodType>(schema: T, name: string) {
  const format = zodTextFormat(schema, name);
  return makeParseableTextFormat<z.infer<T>>(format, (content) => parseTruncatingStrings(schema, JSON.parse(content)));
}
