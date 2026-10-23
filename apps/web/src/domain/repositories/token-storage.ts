export interface TokenStorage {
  get(): string | null;
  set(token: string | null): void;
}
