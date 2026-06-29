import XLSX from "xlsx";
import { BadRequest } from "../exceptions";

export interface CardExcelRow {
  card_id: string;
  nfc_id: string;
}

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

export const ValidateCardExcel = (rows: CardExcelRow[]): void => {
  const cards = new Set<string>();
  const nfcs = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const card = String(row.card_id).trim();
    const nfc = String(row.nfc_id).trim();

    if (!card) {
      throw BadRequest(`Row ${index + 2}: card_id is required.`);
    }

    if (!nfc) {
      throw BadRequest(`Row ${index + 2}: nfc_id is required.`);
    }

    if (cards.has(card)) {
      throw BadRequest(`Duplicate card_id '${card}' at row ${index + 2}.`);
    }

    if (nfcs.has(nfc)) {
      throw BadRequest(`Duplicate nfc_id '${nfc}' at row ${index + 2}.`);
    }

    cards.add(card);
    nfcs.add(nfc);
  }
};
