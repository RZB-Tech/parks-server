import { Op } from "sequelize";

import { AttractionTariffReportDTO } from "../../dtos/attraction-tariff-reports-dtos/AttractionTariffReportDto";
import { AttractionReportModel } from "../../models/postgresql/attraction-report-model/AttractionReportModel";
import { AttractionReportTypes } from "../../models/postgresql/attraction-model/enums";
import { AttractionRoundModel } from "../../models/postgresql/attraction-round-model/AttractionRoundModel";
import { AttractionRoundStatusTypes } from "../../models/postgresql/attraction-round-model/enums";
import { CardModel } from "../../models/postgresql/cards-model/CardModel";
import { CardType } from "../../models/postgresql/cards-model/enums";
import { CardTransactionModel } from "../../models/postgresql/card-transactions-model/CardTransactionModel";
import {
  CardTransactionStatusTypes,
  CardTransactionType,
  PaymentType,
} from "../../models/postgresql/card-transactions-model/enums";

type TariffTransactionPlain = CardTransactionModelI & {
  cards?: Pick<CardsModelI, "id" | "type"> | null;
};

type TariffReportAccumulator = AttractionTariffReportResponseDTO & {
  round_ids: Set<number>;
};

interface GetAttractionTariffReportsData {
  zreport_ids: number[];

  /*
   * null barcha aksiyalarni, [] esa faqat basic to‘lovlarni bildiradi.
   */
  promotion_codes: string[] | null;
}

const tariffTransactionGroupKey = (
  zreportID: number,
  transaction: TariffTransactionPlain,
) =>
  [
    zreportID,
    transaction.attraction_tariff,
    transaction.tariff_name ?? "",
    transaction.promotion ?? "basic",
    transaction.promotion_code ?? "basic",
    Number(transaction.discount_percent || 0),
    Number(transaction.original_unit_price || 0),
    Number(transaction.sale_unit_price || 0),
  ].join(":");

export const GetAttractionTariffReportsByZReportService = async (
  data: GetAttractionTariffReportsData,
): Promise<Map<number, AttractionTariffReportResponseDTO[]>> => {
  const zreportIDs = [
    ...new Set(
      data.zreport_ids
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];

  if (zreportIDs.length === 0) {
    return new Map();
  }

  const xreports = await AttractionReportModel.findAll({
    where: {
      zreport: {
        [Op.in]: zreportIDs,
      },
      report_type: AttractionReportTypes.XREPORT,
    },
    attributes: ["id", "zreport"],
  });

  const zreportByXReport = new Map<number, number>();

  for (const xreport of xreports) {
    const xreportID = Number(xreport.id);
    const zreportID = Number(xreport.zreport);

    if (xreportID > 0 && zreportID > 0) {
      zreportByXReport.set(xreportID, zreportID);
    }
  }

  const xreportIDs = [...zreportByXReport.keys()];

  if (xreportIDs.length === 0) {
    return new Map();
  }

  const [transactions, rounds] = await Promise.all([
    CardTransactionModel.findAll({
      where: {
        xreport: {
          [Op.in]: xreportIDs,
        },
        attraction_tariff: {
          [Op.ne]: null,
        },
        type: CardTransactionType.PAYMENT,
        status: CardTransactionStatusTypes.SUCCESS,
      },
      include: [
        {
          model: CardModel,
          as: "cards",
          required: false,
          attributes: ["id", "type"],
          paranoid: false,
        },
      ],
      order: [["id", "ASC"]],
    }),
    AttractionRoundModel.findAll({
      where: {
        report: {
          [Op.in]: xreportIDs,
        },
        status: AttractionRoundStatusTypes.FINISHED,
      },
      attributes: ["id", "transactions"],
    }),
  ]);

  const roundByTransaction = new Map<number, number>();

  for (const round of rounds) {
    const roundID = Number(round.id);

    for (const transactionID of round.transactions ?? []) {
      const parsedTransactionID = Number(transactionID);

      if (Number.isInteger(parsedTransactionID) && parsedTransactionID > 0) {
        roundByTransaction.set(parsedTransactionID, roundID);
      }
    }
  }

  const selectedPromotionCodes =
    data.promotion_codes === null
      ? null
      : new Set(data.promotion_codes.map((code) => code.trim()).filter(Boolean));
  const grouped = new Map<string, TariffReportAccumulator>();

  for (const transactionModel of transactions) {
    const transaction = transactionModel.get({
      plain: true,
    }) as TariffTransactionPlain;
    const xreportID = Number(transaction.xreport);
    const zreportID = zreportByXReport.get(xreportID);
    const tariffID = Number(transaction.attraction_tariff);

    if (!zreportID || !Number.isInteger(tariffID) || tariffID <= 0) {
      continue;
    }

    const hasPromotion = transaction.promotion !== null;

    if (
      hasPromotion &&
      selectedPromotionCodes !== null &&
      (!transaction.promotion_code ||
        !selectedPromotionCodes.has(transaction.promotion_code))
    ) {
      continue;
    }

    const key = tariffTransactionGroupKey(zreportID, transaction);
    let report = grouped.get(key);

    if (!report) {
      report = {
        attraction_tariff: tariffID,
        tariff_name:
          transaction.tariff_name?.trim() || `Tariff #${tariffID}`,

        promotion:
          transaction.promotion !== null
            ? Number(transaction.promotion)
            : null,
        promotion_code: transaction.promotion_code ?? null,
        promotion_name: transaction.promotion_name ?? null,
        promotion_type: transaction.promotion_type ?? null,

        discount_percent: Number(transaction.discount_percent || 0),
        original_unit_price: Number(transaction.original_unit_price || 0),
        sale_unit_price: Number(transaction.sale_unit_price || 0),

        rounds_count: 0,
        total_people: 0,

        total_virtual: 0,
        total_classic: 0,
        total_vip: 0,
        total_organization: 0,

        total_online: 0,
        total_offline: 0,

        original_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        paid_amount: 0,

        round_ids: new Set(),
      };

      grouped.set(key, report);
    }

    const peopleCount = Number(transaction.people_count || 0);
    const originalAmount = Number(transaction.original_amount || 0);
    const discountAmount = Number(transaction.discount_amount || 0);
    const saleAmount = originalAmount - discountAmount;
    const cardType = transaction.cards?.type;
    const roundID = roundByTransaction.get(Number(transaction.id));

    report.total_people += peopleCount;
    report.original_amount += originalAmount;
    report.discount_amount += discountAmount;
    report.total_amount += saleAmount;

    if (transaction.payment_type === PaymentType.ONLINE) {
      report.total_online += peopleCount;
    } else {
      report.total_offline += peopleCount;
    }

    if (cardType === CardType.VIRTUAL) {
      report.total_virtual += peopleCount;
      report.paid_amount += Number(transaction.amount || 0);
    }

    if (cardType === CardType.CLASSIC) {
      report.total_classic += peopleCount;
      report.paid_amount += Number(transaction.amount || 0);
    }

    if (cardType === CardType.VIP) {
      report.total_vip += peopleCount;
    }

    if (cardType === CardType.ORGANIZATION) {
      report.total_organization += peopleCount;
    }

    if (roundID) {
      report.round_ids.add(roundID);
      report.rounds_count = report.round_ids.size;
    }
  }

  const reportsByZReport = new Map<
    number,
    AttractionTariffReportResponseDTO[]
  >();

  for (const [key, report] of grouped) {
    const zreportID = Number(key.split(":", 1)[0]);
    const { round_ids: _roundIDs, ...plain } = report;
    const current = reportsByZReport.get(zreportID) ?? [];

    current.push(AttractionTariffReportDTO(plain));
    reportsByZReport.set(zreportID, current);
  }

  for (const reports of reportsByZReport.values()) {
    reports.sort((first, second) => {
      if (first.promotion === null && second.promotion !== null) {
        return -1;
      }

      if (first.promotion !== null && second.promotion === null) {
        return 1;
      }

      return first.tariff_name.localeCompare(second.tariff_name);
    });
  }

  return reportsByZReport;
};
