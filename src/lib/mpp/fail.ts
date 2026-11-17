export function fail(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

export function errCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}
