import type { Branch } from '../assets/@types';
import { createMockBranches } from '../assets/mock/organization';
import { recordStatusLabel } from '../utils/status-label';
import { createMockResource } from './mock-api-utils';

export type CreateBranchInput = Omit<Branch, 'id'>;

const branchesApi = createMockResource<Branch, CreateBranchInput>({
  initialData: createMockBranches(),
  idPrefix: 'branch',
  getSearchText: (branch) =>
    [
      branch.code,
      branch.name,
      branch.managerName,
      branch.status,
      recordStatusLabel(branch.status),
    ].join(' '),
  getStatus: (branch) => branch.status,
  createEntity: (input, id) => ({ ...input, id }),
});

export const listBranches = branchesApi.list;
export const createBranch = branchesApi.create;
