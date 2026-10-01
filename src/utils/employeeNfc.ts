import { createHmac } from "node:crypto";

export const EMPLOYEE_NFC_MAX_LENGTH = 255;

const GetEmployeeNfcSecret = (): string => {
  const secret = process.env.EMPLOYEE_NFC_SECRET?.trim();

  if (!secret) {
    throw new Error("EMPLOYEE_NFC_SECRET is not configured!");
  }

  return secret;
};

export const NormalizeEmployeeNfc = (value: unknown): string =>
  String(value ?? "").trim();

export const IsValidEmployeeNfc = (value: unknown): boolean => {
  const nfc = NormalizeEmployeeNfc(value);
  return nfc.length > 0 && nfc.length <= EMPLOYEE_NFC_MAX_LENGTH;
};

export const HashEmployeeNfc = (nfc: string): string =>
  createHmac("sha256", GetEmployeeNfcSecret())
    .update(NormalizeEmployeeNfc(nfc))
    .digest("hex");
