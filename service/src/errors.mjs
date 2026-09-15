export class ServiceError extends Error {
  constructor(code, message, { status = 400, details = null, retryable = false } = {}) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryable = retryable;
  }
}

export function publicError(error) {
  if (error instanceof ServiceError) {
    return { code: error.code, message: error.message, retryable: error.retryable, details: error.details };
  }
  return { code: "INTERNAL_ERROR", message: "服务暂时无法完成计算，请稍后重试。", retryable: true, details: null };
}
