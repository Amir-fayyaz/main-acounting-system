import type { Branch, CreateBranchInput } from '../@types/branch';

interface BranchSeed {
  name: string;
  managerName: string;
}

const BRANCH_SEEDS: readonly BranchSeed[] = [
  { name: 'دفتر مرکزی', managerName: 'علی رضایی' },
  { name: 'شعبه ونک', managerName: 'مریم صادقی' },
  { name: 'شعبه اصفهان', managerName: 'رضا حیدری' },
  { name: 'شعبه تبریز', managerName: 'سارا محمدی' },
  { name: 'شعبه شیراز', managerName: 'امیر کاظمی' },
  { name: 'شعبه مشهد', managerName: 'نگار موسوی' },
  { name: 'شعبه کرج', managerName: 'بابک نیک‌پور' },
  { name: 'شعبه اهواز', managerName: 'فرزانه اکبری' },
  { name: 'شعبه قم', managerName: 'حمید شریفی' },
  { name: 'شعبه رشت', managerName: 'الهام نوری' },
  { name: 'شعبه یزد', managerName: 'کاوه سلطانی' },
  { name: 'شعبه کرمان', managerName: 'پریسا رستمی' },
  { name: 'شعبه اردبیل', managerName: 'مهدی فراهانی' },
  { name: 'شعبه بندرعباس', managerName: 'شادی امینی' },
  { name: 'شعبه همدان', managerName: 'سعید قاسمی' },
  { name: 'شعبه زنجان', managerName: 'لیلا مرادی' },
  { name: 'شعبه ساری', managerName: 'آرش زمانی' },
  { name: 'شعبه بوشهر', managerName: 'نیلوفر توکلی' },
  { name: 'شعبه گرگان', managerName: 'یاسر بهرامی' },
  { name: 'شعبه خرم‌آباد', managerName: 'مینا دهقان' },
  { name: 'شعبه سنندج', managerName: 'پویا جهانی' },
  { name: 'شعبه اراک', managerName: 'سمیرا نظری' },
  { name: 'شعبه کرمانشاه', managerName: 'وحید عباسی' },
];

const SEED_MONTHLY_SALES = 2_400_000_000;
const MONTHLY_SALES_STEP = 87_000_000;

function createSeedBranches(): Branch[] {
  return BRANCH_SEEDS.map((seed, index) => ({
    id: `branch-${String(index + 1).padStart(4, '0')}`,
    code: String(101 + index),
    name: seed.name,
    managerName: seed.managerName,
    cashRegisterCount: 1 + (index % 4),
    userCount: 3 + index * 2,
    monthlySales: (SEED_MONTHLY_SALES - index * MONTHLY_SALES_STEP).toFixed(2),
    currency: 'IRR',
    status: index % 5 === 4 ? 'inactive' : 'active',
  }));
}

/**
 * Session-scoped mock store. Mutating it lets the mock service behave like a
 * real list endpoint within a single browser session.
 */
const branchStore: Branch[] = createSeedBranches();

let nextBranchSequence = branchStore.length + 1;

/** Returns a copy of the stored branches, newest first. */
export function getMockBranches(): Branch[] {
  return branchStore.map((branch) => ({ ...branch }));
}

/** Creates a branch in the mock store and returns it. */
export function insertMockBranch(input: CreateBranchInput): Branch {
  const branch: Branch = {
    id: `branch-${String(nextBranchSequence++).padStart(4, '0')}`,
    code: input.code,
    name: input.name,
    managerName: input.managerName,
    cashRegisterCount: 0,
    userCount: 0,
    monthlySales: '0.00',
    currency: 'IRR',
    status: 'active',
  };

  branchStore.unshift(branch);
  return { ...branch };
}

/** Reports whether a branch code is already taken (case-insensitive). */
export function hasMockBranchCode(code: string): boolean {
  const normalized = code.trim().toLowerCase();
  return branchStore.some((branch) => branch.code.trim().toLowerCase() === normalized);
}
