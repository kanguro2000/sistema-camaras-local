import { UserRepository } from "../../domain/repositories/user.repository.js";
import { AccessTokenService, AuthenticatedUser } from "../../domain/services/access-token-service.js";
import { PasswordHasher } from "../../domain/services/password-hasher.js";

export interface AuthResult {
  accessToken: string;
  user: { id: string; username: string; role: "admin" | "viewer" };
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly accessTokens: AccessTokenService,
  ) {}

  async login(username: string, password: string): Promise<AuthResult | null> {
    const user = this.users.findByUsername(username);
    if (!user || !(await this.passwords.verify(password, user.passwordHash))) return null;

    const identity: AuthenticatedUser = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    return {
      accessToken: this.accessTokens.issue(identity),
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  authenticate(token: string): AuthenticatedUser | null {
    return this.accessTokens.verify(token);
  }
}
