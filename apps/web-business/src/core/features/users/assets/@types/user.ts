export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastActiveAt?: string;
}

export type UserRole = 'admin' | 'manager' | 'employee' | 'viewer';

export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';
