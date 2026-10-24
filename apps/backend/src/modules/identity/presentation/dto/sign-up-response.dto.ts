import { UserResponseDto } from './user-response.dto.js';

/**
 * Response body of `POST /api/v1/auth/sign-up` (IAM-008; FND-006).
 *
 * It is the established public User shape, and nothing else. There is no
 * password, no password hash, no credential record and no authentication token
 * in this response — sign-up registers an identity and establishes the ability
 * to sign in, and it proves neither by handing anything back that could
 * authenticate a user. There is also no tenant, membership, role or permission:
 * a signed-up user has joined no tenant and holds no access.
 */
export class SignUpResponseDto extends UserResponseDto {}
