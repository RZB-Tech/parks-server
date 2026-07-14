import { BadRequest } from "../../exceptions";

export const NormalizeUzPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber || typeof phoneNumber !== "string") {
    throw BadRequest("Phone number is required!");
  }

  let normalizedPhoneNumber = phoneNumber.replace(/\D/g, "");

  /*
   * 901234567
   */
  if (normalizedPhoneNumber.length === 9) {
    normalizedPhoneNumber = `998${normalizedPhoneNumber}`;
  }

  /*
   * 0901234567
   */
  if (
    normalizedPhoneNumber.length === 10 &&
    normalizedPhoneNumber.startsWith("0")
  ) {
    normalizedPhoneNumber = `998${normalizedPhoneNumber.slice(1)}`;
  }

  /*
   * Natija:
   * 998901234567
   */
  if (
    normalizedPhoneNumber.length !== 12 ||
    !normalizedPhoneNumber.startsWith("998")
  ) {
    throw BadRequest("Phone number must be in +998XXXXXXXXX format!");
  }

  return normalizedPhoneNumber;
};
