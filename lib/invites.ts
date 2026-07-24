export function findAllowedInviteCode(
  candidates: unknown[],
  allowedCodes: string[]
) {
  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && allowedCodes.includes(candidate)
  );
}
