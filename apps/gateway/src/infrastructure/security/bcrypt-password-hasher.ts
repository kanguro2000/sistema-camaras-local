import bcrypt from "bcryptjs";
import { PasswordHasher } from "../../domain/services/password-hasher.js";

export class BcryptPasswordHasher implements PasswordHasher {
  hash(password: string, cost: number): Promise<string> {
    return bcrypt.hash(password, cost);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
