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

export function invalid(message: string): never {
    throw new CreateError('INVALID_INPUT', message);
}
