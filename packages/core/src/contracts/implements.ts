export function assertImplements<_Data extends Contract, Contract>(): void {}

export type Implements<Data, Contract> = Data extends Contract ? true : false;
