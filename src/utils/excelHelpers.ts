import XLSX from "xlsx";
import { BadRequest } from "../exceptions";
import {
  IsValidCardBindToken,
  NormalizeCardBindToken,
} from "./client/CardBindTokenHelper";

export interface CardExcelRow {
  card_id: string;
  nfc_id: string;
  bind_token: string;
  __rowNum__?: number;
}

export interface NormalizedCardExcelRow extends CardExcelRow {
  row_number: number;
}

export interface CardImportValidationError {
  code: string;
  field: "card_id" | "nfc_id" | "bind_token";
  row: number;
  card_id?: string;
  nfc_id?: string;
  duplicate_of_row?: number;
  existing_record_id?: number;
}

export interface CardExcelValidationResult {
  rows: NormalizedCardExcelRow[];
  errors: CardImportValidationError[];
}

export const NormalizeCardNfcID = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .replace(/^0/, "");

export const ParseCardExcel = (buffer: Buffer): CardExcelRow[] => {
  const workbook = XLSX.read(buffer);

  if (!workbook.SheetNames.length) {
    throw BadRequest("Excel sheet not found.");
  }

  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json<CardExcelRow>(worksheet, {
    raw: false,
    defval: "",
  });

  if (!rows.length) {
    throw BadRequest("Excel is empty.");
  }

  return rows;
};

export const ValidateCardExcel = (
  rows: CardExcelRow[],
): CardExcelValidationResult => {
  const cards = new Map<string, number>();
  const nfcs = new Map<string, number>();
  const errors: CardImportValidationError[] = [];

  const normalizedRows = rows.map((row, index) => ({
    row_number:
      typeof row.__rowNum__ === "number" ? row.__rowNum__ + 1 : index + 2,
    card_id: String(row.card_id).trim(),
    nfc_id: NormalizeCardNfcID(row.nfc_id),
    bind_token: NormalizeCardBindToken(row.bind_token),
  }));

  for (const row of normalizedRows) {
    const card = row.card_id;
    const nfc = row.nfc_id;
    const bindToken = row.bind_token;
    const rowNumber = row.row_number;

    if (!card) {
      errors.push({
        code: "CARD_ID_REQUIRED",
        field: "card_id",
        row: rowNumber,
      });
    }

    if (!nfc) {
      errors.push({
        code: "NFC_ID_REQUIRED",
        field: "nfc_id",
        row: rowNumber,
      });
    }

    if (!bindToken) {
      errors.push({
        code: "BIND_TOKEN_REQUIRED",
        field: "bind_token",
        row: rowNumber,
      });
    } else if (!IsValidCardBindToken(bindToken)) {
      errors.push({
        code: "BIND_TOKEN_INVALID",
        field: "bind_token",
        row: rowNumber,
      });
    }

    if (card) {
      const firstRow = cards.get(card);

      if (firstRow !== undefined) {
        errors.push({
          code: "DUPLICATE_CARD_ID_IN_FILE",
          field: "card_id",
          row: rowNumber,
          card_id: card,
          duplicate_of_row: firstRow,
        });
      } else {
        cards.set(card, rowNumber);
      }
    }

    if (nfc) {
      const firstRow = nfcs.get(nfc);

      if (firstRow !== undefined) {
        errors.push({
          code: "DUPLICATE_NFC_ID_IN_FILE",
          field: "nfc_id",
          row: rowNumber,
          nfc_id: nfc,
          duplicate_of_row: firstRow,
        });
      } else {
        nfcs.set(nfc, rowNumber);
      }
    }
  }

  return { rows: normalizedRows, errors };
};
