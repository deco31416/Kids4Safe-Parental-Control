export function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  const maybeHttpError = error as { response?: { status?: number } };
  return maybeHttpError.response?.status;
}
