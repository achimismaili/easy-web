export class CreateError extends Error {
    constructor(
        readonly code: 'INVALID_INPUT' | 'CREATE_FAILED',
        message: string,
        options?: ErrorOptions,
    ) {
        super(message, options);
        this.name = 'CreateError';
    }
}

export function causeMessage(error: Error): string | undefined {
    const messages: string[] = [];
    let cause = error.cause;
    while (cause !== undefined) {
        const message = cause instanceof Error ? cause.message : String(cause);
        if (message) messages.push(message);
        cause = cause instanceof Error ? cause.cause : undefined;
    }
    return messages.length ? messages.join(': ') : undefined;
}

export function invalid(message: string): never {
    throw new CreateError('INVALID_INPUT', message);
}
