import type { CreatePersonInput, Person, PersonKind } from '../@types/person';

const KINDS: PersonKind[] = ['مشتری', 'تأمین‌کننده', 'هر دو'];

const BRANCHES = ['دفتر مرکزی', 'شعبه ونک', 'شعبه اصفهان', 'شعبه تبریز'];

const NAMES = [
  'شرکت آرمان تجارت',
  'فروشگاه نوید',
  'بازرگانی پارس',
  'احمد کریمی',
  'مریم صادقی',
  'گروه صنعتی البرز',
  'داروخانه مهر',
  'رضا حیدری',
  'پخش سپهر',
  'سارا محمدی',
  'تولیدی آریا',
  'کامران اکبری',
];

function formatFa(n: number): string {
  return n.toLocaleString('fa-IR', { maximumFractionDigits: 0 });
}

function createSeedPeople(): Person[] {
  return NAMES.map((name, index) => ({
    id: `person-${String(index + 1).padStart(4, '0')}`,
    name,
    kind: KINDS[index % KINDS.length],
    phone: `۰۹۱۲${formatFa(1000000 + index * 12345).replace(/٬/g, '')}`,
    branch: BRANCHES[index % BRANCHES.length],
    recv: (index * 123456789 + 50000000).toFixed(2),
    pay: (index * 45678912 + 20000000).toFixed(2),
    currency: 'IRR',
  }));
}

const personStore: Person[] = createSeedPeople();

let nextPersonSequence = personStore.length + 1;

export function getMockPeople(): Person[] {
  return personStore.map((person) => ({ ...person }));
}

export function insertMockPerson(input: CreatePersonInput): Person {
  const person: Person = {
    id: `person-${String(nextPersonSequence++).padStart(4, '0')}`,
    name: input.name.trim(),
    kind: input.kind,
    phone: input.phone.trim(),
    branch: 'دفتر مرکزی',
    recv: '0.00',
    pay: '0.00',
    currency: 'IRR',
  };

  personStore.unshift(person);
  return { ...person };
}

export function hasMockPersonName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return personStore.some((p) => p.name.trim().toLowerCase() === normalized);
}
