import type { CreateUserInput, User, UserStatus } from '../@types/user';

type StoredUser = Omit<User, 'id'> & { id: number };

const SEED_USERS: ReadonlyArray<Omit<StoredUser, 'id'>> = [
  { name: 'علی رضایی', email: 'user1@example.com', role: 'مدیر مالی', branch: 'دفتر مرکزی', status: 'active' },
  { name: 'مریم صادقی', email: 'user2@example.com', role: 'حسابدار ارشد', branch: 'شعبه ونک', status: 'active' },
  { name: 'رضا حیدری', email: 'user3@example.com', role: 'صندوقدار', branch: 'شعبه اصفهان', status: 'active' },
  { name: 'سارا محمدی', email: 'user4@example.com', role: 'حسابدار', branch: 'شعبه تبریز', status: 'active' },
  { name: 'کامران اکبری', email: 'user5@example.com', role: 'مدیر شعبه', branch: 'دفتر مرکزی', status: 'active' },
  { name: 'نگار فرهادی', email: 'user6@example.com', role: 'ناظر (فقط مشاهده)', branch: 'شعبه ونک', status: 'inactive' },
];

let nextId = SEED_USERS.length + 1;

let users: StoredUser[] = SEED_USERS.map((user, index) => ({
  ...user,
  id: index + 1,
}));

function toPublicUser(user: StoredUser): User {
  return { ...user, id: String(user.id) };
}

export function getMockUsers(): User[] {
  return users.map(toPublicUser);
}

export function createUserId(): string {
  return String(nextId++);
}

export function hasMockUserEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return users.some((u) => u.email.toLowerCase() === normalized);
}

export function insertMockUser(input: CreateUserInput): User {
  const record: StoredUser = {
    id: nextId++,
    name: input.name.trim(),
    email: input.email.trim(),
    role: input.role.trim(),
    branch: input.branch?.trim() || 'دفتر مرکزی',
    status: 'active' as UserStatus,
  };

  users = [...users, record];
  return toPublicUser(record);
}
