/**
 * Public domain exports for the Identity module. Other layers must import
 * identity domain types from this entry point only.
 */
export { User, type UserId, type UserStatus, userId } from './aggregates/user.aggregate';
export { Email } from './value-objects/email.vo';
export { PasswordHash } from './value-objects/password-hash.vo';
export { InvalidEmailError } from './errors/invalid-email.error';
export { InvalidPasswordError } from './errors/invalid-password.error';
export { UserRegistered } from './events/user-registered.event';
