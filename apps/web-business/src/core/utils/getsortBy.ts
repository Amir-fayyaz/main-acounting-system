import { SortBy } from "../assets/@types/sortBy";

export function getSortBy(sortType: SortBy): string {
  switch (sortType) {
    case SortBy.NEWEST:
      return "جدیدترین";

    case SortBy.OLDEST:
      return "قدیمی‌ترین";

    case SortBy.PRICE_ASC:
      return "قیمت: کم به زیاد";

    case SortBy.PRICE_DESC:
      return "قیمت: زیاد به کم";

    case SortBy.DISCOUNT_ASC:
      return "تخفیف: کم به زیاد";

    case SortBy.DISCOUNT_DESC:
      return "تخفیف: زیاد به کم";

    case SortBy.TITLE_ASC:
      return "نام: الف تا ی";

    default:
      return "نامشخص";
  }
}
