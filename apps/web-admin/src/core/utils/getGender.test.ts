import { describe, expect, it } from "vitest";
import { GenderEnum } from "../assets/@types/gender.enum";
import { getGender } from "./getGender";

describe("getGender", () => {
  it("should return female label for FEMALE", () => {
    expect(getGender(GenderEnum.FEMALE)).toBe("زن");
  });

  it("should return male label for MALE", () => {
    expect(getGender(GenderEnum.MALE)).toBe("مرد");
  });

  it("should return unknown label for invalid value", () => {
    expect(getGender("unknown" as GenderEnum)).toBe("نامشخص");
  });
});
