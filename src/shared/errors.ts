export function forbid(message = "Forbidden") {
  const err: any = new Error(message);
  err.statusCode = 403;
  return err;
}
