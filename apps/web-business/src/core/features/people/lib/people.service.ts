import type {
  CreatePersonInput,
  ListPeopleParams,
  Person,
  PersonSortItem,
} from '../assets/@types/person';
import { getMockPeople, hasMockPersonName, insertMockPerson } from '../assets/mock/people.mock';

export const PEOPLE_DEFAULT_LIMIT = 20;
export const PEOPLE_MAX_LIMIT = 100;

export interface PersonListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PersonListResponse {
  data: Person[];
  meta: PersonListMeta;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isSafeInteger(limit) || limit < 1) {
    return PEOPLE_DEFAULT_LIMIT;
  }
  return Math.min(limit, PEOPLE_MAX_LIMIT);
}

function searchHaystack(person: Person): string {
  return [person.name, person.kind, person.phone, person.branch].join(' ').toLowerCase();
}

function filterPeople(params: ListPeopleParams): Person[] {
  const search = params.search?.trim().toLowerCase() ?? '';
  const kind = params.kind?.trim() ?? '';

  return getMockPeople().filter((person) => {
    if (kind && person.kind !== kind) return false;
    if (!search) return true;
    return searchHaystack(person).includes(search);
  });
}

function comparePeople(a: Person, b: Person, sort: PersonSortItem): number {
  const key = sort.id as keyof Person;
  if (key === 'recv' || key === 'pay') {
    return Number(a[key]) - Number(b[key]);
  }
  return String(a[key]).localeCompare(String(b[key]), 'fa');
}

function sortPeople(people: Person[], sort: PersonSortItem[] | undefined): Person[] {
  if (!sort?.length) return people;
  return [...people].sort((a, b) => {
    for (const item of sort) {
      const result = comparePeople(a, b, item);
      if (result !== 0) return item.desc ? -result : result;
    }
    return 0;
  });
}

export async function listAllPeople(
  params: Pick<ListPeopleParams, 'search' | 'kind' | 'sort'> = {},
): Promise<Person[]> {
  return sortPeople(filterPeople(params), params.sort);
}

export async function listPeople(params: ListPeopleParams = {}): Promise<PersonListResponse> {
  const limit = normalizeLimit(params.limit);

  const requestedPage =
    Number.isSafeInteger(params.page) && (params.page ?? 0) >= 1
      ? (params.page as number)
      : 1;

  const filtered = sortPeople(filterPeople(params), params.sort);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * limit;

  return {
    data: filtered.slice(start, start + limit),
    meta: { page, limit, total, totalPages },
  };
}

export async function createPerson(input: CreatePersonInput): Promise<Person> {
  if (hasMockPersonName(input.name)) {
    throw new Error('شخصی با این نام قبلاً ثبت شده است.');
  }
  return insertMockPerson(input);
}
