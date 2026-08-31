import { AggregateRoot } from '../../../shared/domain/aggregate-root';
import { InvalidStateError } from '../../../shared/domain/invalid-state.error';
import { InvalidValueError } from '../../../shared/domain/invalid-value.error';
import { UserRegistered } from './events/user-registered.event';

export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export class User extends AggregateRoot<string> {
  private constructor(id: string, private name: string, private credential: string, private passwordHash: string, private status: UserStatus) { super(id); }
  static register(id: string, name: string, credential: string, passwordHash: string): User {
    if (!name.trim() || !credential.trim() || !passwordHash) throw new InvalidValueError('Invalid user registration');
    const user = new User(id, name.trim(), credential.trim().toLowerCase(), passwordHash, 'ACTIVE'); user.addEvent(new UserRegistered(id)); return user;
  }
  suspend(): void { if (this.status === 'SUSPENDED') throw new InvalidStateError('User already suspended'); this.status = 'SUSPENDED'; }
  activate(): void { this.status = 'ACTIVE'; }
  get isActive(): boolean { return this.status === 'ACTIVE'; }
  get emailOrPhone(): string { return this.credential; }
  get displayName(): string { return this.name; }
  get hash(): string { return this.passwordHash; }
}
