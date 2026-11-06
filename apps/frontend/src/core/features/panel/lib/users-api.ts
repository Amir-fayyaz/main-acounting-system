import type { PanelUser } from '../assets/@types';
import { createMockUsers } from '../assets/mock/organization';
import { recordStatusLabel } from '../utils/status-label';
import { createMockResource } from './mock-api-utils';

export type CreatePanelUserInput = Omit<PanelUser, 'id'>;

const usersApi = createMockResource<PanelUser, CreatePanelUserInput>({
  initialData: createMockUsers(),
  idPrefix: 'user',
  getSearchText: (user) =>
    [
      user.name,
      user.email,
      user.role,
      user.branchName,
      user.status,
      recordStatusLabel(user.status),
    ].join(' '),
  getStatus: (user) => user.status,
  createEntity: (input, id) => ({ ...input, id }),
});

export const listPanelUsers = usersApi.list;
export const createPanelUser = usersApi.create;
