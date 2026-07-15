import { QueryTypes, Transaction } from "sequelize";
import { CardModel } from "../../models/postgresql/cards-model/CardModel";

export const GetVirtualCardBatchName = (date = new Date()): string => {
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);

  const month = dateParts.find((item) => item.type === "month")?.value;
  const year = dateParts.find((item) => item.type === "year")?.value;

  if (!month || !year) {
    throw new Error("Unable to generate virtual card batch name!");
  }

  return `${month}.${year} Virtual Cards`;
};

export const GenerateVirtualCardNumber = async (
  transaction: Transaction,
): Promise<string> => {
  const sequelize = CardModel.sequelize!;

  const result = await sequelize.query<{ card_number: string }>(
    `
      SELECT
        nextval('virtual_card_number_seq')::TEXT
        AS card_number
    `,
    {
      type: QueryTypes.SELECT,
      transaction,
    },
  );

  const cardNumber = result[0]?.card_number;

  if (!cardNumber || !/^3\d{8}$/.test(cardNumber)) {
    throw new Error("Unable to generate virtual card number!");
  }

  return cardNumber;
};

export const GenerateVirtualCardNfc = async (
  transaction: Transaction,
): Promise<string> => {
  const sequelize = CardModel.sequelize!;

  const result = await sequelize.query<{ nfc_number: string }>(
    `
      SELECT
        nextval('virtual_card_nfc_seq')::TEXT
        AS nfc_number
    `,
    {
      type: QueryTypes.SELECT,
      transaction,
    },
  );

  const nfcNumber = result[0]?.nfc_number;

  if (!nfcNumber || !/^3001\d{8}$/.test(nfcNumber)) {
    throw new Error("Unable to generate virtual card NFC!");
  }

  return nfcNumber;
};
