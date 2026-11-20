import { AccountType } from '../value-objects/account-type.js';
import { NormalBalance } from '../value-objects/account-normal-balance.js';

export interface StandardChartTemplateAccount {
  readonly code: string;
  readonly name: string;
  readonly parentCode: string | null;
  readonly type: AccountType;
  readonly normalBalance: NormalBalance;
  readonly postable: boolean;
}

export interface StandardChartTemplate {
  readonly version: string;
  readonly accounts: readonly StandardChartTemplateAccount[];
}

export interface ChartTemplateViolation {
  readonly code:
    | 'DUPLICATE_CODE'
    | 'MISSING_PARENT'
    | 'TYPE_MISMATCH'
    | 'NORMAL_BALANCE_MISMATCH'
    | 'POSTABLE_WITH_CHILDREN';
  readonly accountCode: string;
  readonly message: string;
}

function account(
  code: string,
  name: string,
  parentCode: string | null,
  type: AccountType,
  normalBalance: NormalBalance,
  postable: boolean,
): StandardChartTemplateAccount {
  return { code, name, parentCode, type, normalBalance, postable };
}

const ASSET = AccountType.ASSET;
const LIABILITY = AccountType.LIABILITY;
const EQUITY = AccountType.EQUITY;
const REVENUE = AccountType.REVENUE;
const EXPENSE = AccountType.EXPENSE;
const DEBIT = NormalBalance.DEBIT;
const CREDIT = NormalBalance.CREDIT;

/**
 * The Iranian standard chart of accounts used by ACC-001.4 (DEC-01).
 *
 * Codes are numeric and hierarchical: one digit per level for the five roots,
 * two for a group, four for a general account and six for a postable detail
 * account. The list is deliberately flat and parents-first so activation can
 * insert it in order with no recursion, and so the template itself can be
 * validated without constructing aggregates.
 */
export const STANDARD_CHART_TEMPLATE: StandardChartTemplate = {
  version: 'ir-standard-v1',
  accounts: [
    account('1', 'دارایی‌ها', null, ASSET, DEBIT, false),
    account('11', 'دارایی‌های جاری', '1', ASSET, DEBIT, false),
    account('1101', 'موجودی نقد و بانک‌ها', '11', ASSET, DEBIT, false),
    account('110101', 'صندوق', '1101', ASSET, DEBIT, true),
    account('110102', 'بانک ملت', '1101', ASSET, DEBIT, true),
    account('110103', 'حساب‌های دریافتنی تجاری', '1101', ASSET, DEBIT, true),
    account('110104', 'موجودی کالا', '1101', ASSET, DEBIT, true),
    account('110105', 'مالیات بر ارزش افزوده ورودی', '1101', ASSET, DEBIT, true),
    account('12', 'دارایی‌های غیرجاری', '1', ASSET, DEBIT, false),
    account('1201', 'دارایی‌های ثابت', '12', ASSET, DEBIT, false),
    account('120101', 'اموال، ماشین‌آلات و تجهیزات', '1201', ASSET, DEBIT, true),
    account('120102', 'دارایی‌های نامشهود', '1201', ASSET, DEBIT, true),

    account('2', 'بدهی‌ها', null, LIABILITY, CREDIT, false),
    account('21', 'بدهی‌های جاری', '2', LIABILITY, CREDIT, false),
    account('2101', 'حساب‌های پرداختنی', '21', LIABILITY, CREDIT, false),
    account('210101', 'حساب‌های پرداختنی تجاری', '2101', LIABILITY, CREDIT, true),
    account('210102', 'مالیات بر ارزش افزوده پرداختنی', '2101', LIABILITY, CREDIT, true),
    account('210103', 'حقوق و دستمزد پرداختنی', '2101', LIABILITY, CREDIT, true),
    account('2102', 'تسهیلات مالی', '21', LIABILITY, CREDIT, false),
    account('210201', 'وام‌های بانکی', '2102', LIABILITY, CREDIT, true),

    account('3', 'سرمایه', null, EQUITY, CREDIT, false),
    account('31', 'سرمایه و اندوخته‌ها', '3', EQUITY, CREDIT, false),
    account('3101', 'سرمایه', '31', EQUITY, CREDIT, false),
    account('310101', 'سرمایه ثبت‌شده', '3101', EQUITY, CREDIT, true),
    account('310102', 'سود و زیان انباشته', '3101', EQUITY, CREDIT, true),

    account('4', 'درآمدها', null, REVENUE, CREDIT, false),
    account('41', 'درآمدهای عملیاتی', '4', REVENUE, CREDIT, false),
    account('4101', 'فروش کالا و خدمات', '41', REVENUE, CREDIT, false),
    account('410101', 'فروش کالا', '4101', REVENUE, CREDIT, true),
    account('410102', 'فروش خدمات', '4101', REVENUE, CREDIT, true),
    account('42', 'درآمدهای غیرعملیاتی', '4', REVENUE, CREDIT, false),
    account('4201', 'درآمدهای متفرقه', '42', REVENUE, CREDIT, false),
    account('420101', 'درآمد متفرقه', '4201', REVENUE, CREDIT, true),

    account('5', 'هزینه‌ها', null, EXPENSE, DEBIT, false),
    account('51', 'بهای تمام‌شده', '5', EXPENSE, DEBIT, false),
    account('5101', 'بهای تمام‌شده کالای فروش‌رفته', '51', EXPENSE, DEBIT, false),
    account('510101', 'بهای تمام‌شده کالای فروش‌رفته', '5101', EXPENSE, DEBIT, true),
    account('52', 'هزینه‌های اداری و فروش', '5', EXPENSE, DEBIT, false),
    account('5201', 'هزینه‌های اداری', '52', EXPENSE, DEBIT, false),
    account('520101', 'هزینه حقوق و دستمزد', '5201', EXPENSE, DEBIT, true),
    account('520102', 'هزینه اجاره', '5201', EXPENSE, DEBIT, true),
    account('520103', 'هزینه‌های متفرقه', '5201', EXPENSE, DEBIT, true),
    account('53', 'تخفیف خرید و برگشت خرید', '5', EXPENSE, DEBIT, false),
    account('5301', 'تخفیف خرید', '53', EXPENSE, DEBIT, false),
    account('530101', 'تخفیف خرید', '5301', EXPENSE, DEBIT, true),
  ],
};

/**
 * Checks every hierarchy invariant the template must satisfy before it is
 * applied. Activation trusts this data, so a broken template must fail here (in
 * a test) rather than produce an invalid chart for a company.
 */
export function validateStandardChartTemplate(
  template: StandardChartTemplate,
): readonly ChartTemplateViolation[] {
  const violations: ChartTemplateViolation[] = [];
  const seen = new Map<string, { account: StandardChartTemplateAccount; index: number }>();
  const childCodes = new Set<string>();

  template.accounts.forEach((entry, index) => {
    const duplicate = seen.get(entry.code);
    if (duplicate !== undefined) {
      violations.push({
        code: 'DUPLICATE_CODE',
        accountCode: entry.code,
        message: `Account code ${entry.code} appears more than once.`,
      });
      return;
    }

    seen.set(entry.code, { account: entry, index });

    if (entry.parentCode === null) {
      return;
    }

    childCodes.add(entry.parentCode);

    const parent = seen.get(entry.parentCode);
    if (parent === undefined) {
      violations.push({
        code: 'MISSING_PARENT',
        accountCode: entry.code,
        message: `Parent ${entry.parentCode} is missing or does not appear before its child.`,
      });
      return;
    }

    if (!entry.type.equals(parent.account.type)) {
      violations.push({
        code: 'TYPE_MISMATCH',
        accountCode: entry.code,
        message: `Account ${entry.code} has type ${entry.type.value}, parent ${entry.parentCode} has ${parent.account.type.value}.`,
      });
    }

    if (!entry.normalBalance.equals(parent.account.normalBalance)) {
      violations.push({
        code: 'NORMAL_BALANCE_MISMATCH',
        accountCode: entry.code,
        message: `Account ${entry.code} has normal balance ${entry.normalBalance.value}, parent ${entry.parentCode} has ${parent.account.normalBalance.value}.`,
      });
    }
  });

  for (const entry of template.accounts) {
    if (entry.postable && childCodes.has(entry.code)) {
      violations.push({
        code: 'POSTABLE_WITH_CHILDREN',
        accountCode: entry.code,
        message: `Account ${entry.code} is postable but also has children.`,
      });
    }
  }

  return violations;
}
