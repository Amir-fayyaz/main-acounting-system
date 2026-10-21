import { GenderEnum } from "../assets/@types/gender.enum";

export function getGender(type: GenderEnum): string {
  switch (type) {
    case GenderEnum.FEMALE:
      return "زن";
    case GenderEnum.MALE:
      return "مرد";

    default:
      return "نامشخص";
  }
}
