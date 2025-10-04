export function isUnauthorizedError(error: Error): boolean {
  if (!error?.message) {
    return false;
  }

  const match = /^\s*(\d{3})\b/.exec(error.message);
  return match?.[1] === "401";
}