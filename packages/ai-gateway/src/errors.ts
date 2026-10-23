export class AiGatewayError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'timeout'
      | 'budget_exceeded'
      | 'provider_error'
      | 'invalid_response'
      | 'aborted',
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AiGatewayError';
  }
}
