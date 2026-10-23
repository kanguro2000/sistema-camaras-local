export interface PasswordHasher {
  hash(password: string, cost: number): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}
