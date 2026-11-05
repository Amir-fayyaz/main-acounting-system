import type { Person } from '../assets/@types';
import { createMockPeople } from '../assets/mock/organization';
import { createMockResource } from './mock-api-utils';

export type CreatePersonInput = Omit<Person, 'id'>;

const peopleApi = createMockResource<Person, CreatePersonInput>({
  initialData: createMockPeople(),
  idPrefix: 'person',
  getSearchText: (person) => [person.name, person.kind, person.phone, person.branchName].join(' '),
  createEntity: (input, id) => ({ ...input, id }),
});

export const listPeople = peopleApi.list;
export const createPerson = peopleApi.create;
