import { PromotionReportDTO } from "../promotion-reports-dtos/PromotionReportDto";
import {
  AttractionTariffReportDTO,
  CombineAttractionTariffReportsDTO,
} from "../attraction-tariff-reports-dtos/AttractionTariffReportDto";

const AttractionZPromotionReportDTO = (
  data: PromotionReportPlain,
): AttractionZPromotionReportResponseDTO => ({
  ...PromotionReportDTO(data),
  tariff_reports: Array.isArray(data.tariff_reports)
    ? data.tariff_reports.map(AttractionTariffReportDTO)
    : [],
});

/*
|--------------------------------------------------------------------------
| REPORT OPERATOR
|--------------------------------------------------------------------------
*/

export const AttractionReportOperatorDTO = (
  data: AttractionReportOperatorPlain | null | undefined,
): AttractionReportOperatorResponseDTO | null => {
  if (!data) {
    return null;
  }

  return {
    id: Number(data.id),

    firstname: data.firstname,
    lastname: data.lastname,

    file:
      data.file !== null && data.file !== undefined ? Number(data.file) : null,
  };
};

/*
|--------------------------------------------------------------------------
| ATTRACTION REPORT
|--------------------------------------------------------------------------
*/

export const AttractionReportDTO = (
  data: AttractionReportWithOperatorPlain,
): AttractionReportResponseDTO => {
  const operator =
    data.operators !== undefined
      ? AttractionReportOperatorDTO(data.operators)
      : data.operator !== null && data.operator !== undefined
        ? Number(data.operator)
        : null;

  return {
    id: Number(data.id),
    attraction: Number(data.attraction),

    operator,

    report_type: data.report_type,

    zreport:
      data.zreport !== null && data.zreport !== undefined
        ? Number(data.zreport)
        : null,

    status: data.status,

    opened_at: data.opened_at,
    stopped_at: data.stopped_at ?? null,
    closed_at: data.closed_at ?? null,

    confirmed_at: data.confirmed_at ?? null,

    confirmed_by:
      data.confirmed_by !== null && data.confirmed_by !== undefined
        ? Number(data.confirmed_by)
        : null,

    total_rounds: Number(data.total_rounds || 0),
    total_people: Number(data.total_people || 0),
    refund_count: Number(data.refund_count || 0),

    total_offline: Number(data.total_offline || 0),
    total_online: Number(data.total_online || 0),

    total_virtual: Number(data.total_virtual || 0),
    total_classic: Number(data.total_classic || 0),

    total_vip: Number(data.total_vip || 0),
    total_organization: Number(data.total_organization || 0),

    paid_amount: Number(data.paid_amount || 0),
    total_amount: Number(data.total_amount || 0),

    promotion_reports: Array.isArray(data.promotion_reports)
      ? data.promotion_reports.map(PromotionReportDTO)
      : [],

    created_at: data.createdAt ?? data.created_at,
  };
};

/*
|--------------------------------------------------------------------------
| TODAY REPORTS
|--------------------------------------------------------------------------
*/

export const AttractionReportsTodayDTO = (data: {
  zreport: AttractionReportWithOperatorPlain | null;
  xreports: AttractionReportWithOperatorPlain[];
}): AttractionReportsTodayDto => {
  return {
    zreport: data.zreport ? AttractionReportDTO(data.zreport) : null,

    xreports: data.xreports.map(AttractionReportDTO),
  };
};

/*
|--------------------------------------------------------------------------
| EMPTY ZREPORT TOTALS
|--------------------------------------------------------------------------
*/

export const emptyAttractionZReportsTotals = (): AttractionZReportTotalsDTO => {
  return {
    total_rounds: 0,
    total_people: 0,
    refund_count: 0,

    total_offline: 0,
    total_online: 0,

    total_virtual: 0,
    total_classic: 0,

    total_vip: 0,
    total_organization: 0,

    paid_amount: 0,
    total_amount: 0,
  };
};

/*
|--------------------------------------------------------------------------
| ADD ZREPORT TOTALS
|--------------------------------------------------------------------------
*/

export const addAttractionZReportsTotals = (
  target: AttractionZReportTotalsDTO,
  report: AttractionReportModelI,
) => {
  target.total_rounds += Number(report.total_rounds || 0);
  target.total_people += Number(report.total_people || 0);
  target.refund_count += Number(report.refund_count || 0);

  target.total_offline += Number(report.total_offline || 0);
  target.total_online += Number(report.total_online || 0);

  target.total_virtual += Number(report.total_virtual || 0);
  target.total_classic += Number(report.total_classic || 0);

  target.total_vip += Number(report.total_vip || 0);
  target.total_organization += Number(report.total_organization || 0);

  target.paid_amount += Number(report.paid_amount || 0);
  target.total_amount += Number(report.total_amount || 0);
};

/*
|--------------------------------------------------------------------------
| EMPTY PROMOTION TOTALS
|--------------------------------------------------------------------------
*/

export const emptyPromotionReportTotals = (): PromotionReportTotalsDTO => {
  return {
    rounds_count: 0,
    total_people: 0,
    refund_count: 0,

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
  };
};

/*
|--------------------------------------------------------------------------
| ADD PROMOTION TOTALS
|--------------------------------------------------------------------------
*/

export const addPromotionReportTotals = (
  target: PromotionReportTotalsDTO,
  report: PromotionReportPlain,
) => {
  target.rounds_count += Number(report.rounds_count || 0);

  target.total_people += Number(report.total_people || 0);
  target.refund_count += Number(report.refund_count || 0);

  target.total_virtual += Number(report.total_virtual || 0);
  target.total_classic += Number(report.total_classic || 0);

  target.total_vip += Number(report.total_vip || 0);
  target.total_organization += Number(report.total_organization || 0);

  target.total_online += Number(report.total_online || 0);
  target.total_offline += Number(report.total_offline || 0);

  target.original_amount += Number(report.original_amount || 0);
  target.discount_amount += Number(report.discount_amount || 0);
  target.total_amount += Number(report.total_amount || 0);
  target.paid_amount += Number(report.paid_amount || 0);
};

export const addPromotionToAttractionZReportsTotals = (
  target: AttractionZReportTotalsDTO,
  report: PromotionReportPlain,
) => {
  target.total_rounds += Number(report.rounds_count || 0);
  target.total_people += Number(report.total_people || 0);
  target.refund_count += Number(report.refund_count || 0);
  target.total_offline += Number(report.total_offline || 0);
  target.total_online += Number(report.total_online || 0);
  target.total_virtual += Number(report.total_virtual || 0);
  target.total_classic += Number(report.total_classic || 0);
  target.total_vip += Number(report.total_vip || 0);
  target.total_organization += Number(report.total_organization || 0);
  target.paid_amount += Number(report.paid_amount || 0);
  target.total_amount += Number(report.total_amount || 0);
};

export const combineAttractionZReportTotals = (
  report: AttractionReportModelI,
  promotionReports: PromotionReportPlain[],
  promotionOnly = false,
): AttractionZReportTotalsDTO => {
  const totals = emptyAttractionZReportsTotals();

  if (!promotionOnly) {
    addAttractionZReportsTotals(totals, report);
  }

  for (const promotionReport of promotionReports) {
    addPromotionToAttractionZReportsTotals(totals, promotionReport);
  }

  return totals;
};

/*
|--------------------------------------------------------------------------
| ATTRACTION WITH ZREPORTS
|--------------------------------------------------------------------------
*/

export const AttractionZReportAttractionDTO = (
  data: AttractionWithZReportsPlain,
  promotionOnly = false,
): AttractionZReportAttractionResponseDTO => {
  const reports = Array.isArray(data.reports) ? data.reports : [];
  const promotionReports = reports.flatMap((report) =>
    Array.isArray(report.promotion_reports) ? report.promotion_reports : [],
  );
  const tariffReports = reports.flatMap((report) => [
    ...(Array.isArray(report.tariff_reports) ? report.tariff_reports : []),
    ...(Array.isArray(report.promotion_reports)
      ? report.promotion_reports.flatMap((promotionReport) =>
          Array.isArray(promotionReport.tariff_reports)
            ? promotionReport.tariff_reports
            : [],
        )
      : []),
  ]);
  const totalReports = emptyAttractionZReportsTotals();

  for (const report of reports) {
    const reportPromotionReports = Array.isArray(report.promotion_reports)
      ? report.promotion_reports
      : [];
    const reportTotals = combineAttractionZReportTotals(
      report,
      reportPromotionReports,
      promotionOnly,
    );

    totalReports.total_rounds += reportTotals.total_rounds;
    totalReports.total_people += reportTotals.total_people;
    totalReports.refund_count += reportTotals.refund_count;
    totalReports.total_offline += reportTotals.total_offline;
    totalReports.total_online += reportTotals.total_online;
    totalReports.total_virtual += reportTotals.total_virtual;
    totalReports.total_classic += reportTotals.total_classic;
    totalReports.total_vip += reportTotals.total_vip;
    totalReports.total_organization += reportTotals.total_organization;
    totalReports.paid_amount += reportTotals.paid_amount;
    totalReports.total_amount += reportTotals.total_amount;
  }

  return {
    id: Number(data.id),

    name: data.name,

    manufacturer: data.manufacturer ?? null,

    status: data.status,

    dashboard_file:
      data.dashboard_file !== null && data.dashboard_file !== undefined
        ? Number(data.dashboard_file)
        : null,

    main_file:
      data.main_file !== null && data.main_file !== undefined
        ? Number(data.main_file)
        : null,

    files: Array.isArray(data.files) ? data.files.map(Number) : [],

    size: Number(data.size || 1),
    price: data.price === null ? null : Number(data.price),
    pricing_type: data.price === null ? "tariff" : "single",
    tariffs: (data.tariffs ?? []).map((tariff) => ({
      id: Number(tariff.id),
      name: tariff.name,
      price: Number(tariff.price),
      status: tariff.status,
      sort_order: Number(tariff.sort_order || 0),
    })),
    duration: Number(data.duration || 0),
    seats: Number(data.seats || 0),

    age_limit: Number(data.age_limit || 0),
    min_height: Number(data.min_height || 0),
    max_weight: Number(data.max_weight || 0),

    description: data.description ?? null,

    zreports: reports.map((report) => {
      const {
        promotion_reports: _promotionReports,
        ...zreport
      } = AttractionReportDTO(report);

      return {
        ...zreport,
        tariff_reports: Array.isArray(report.tariff_reports)
          ? report.tariff_reports.map(AttractionTariffReportDTO)
          : [],
      };
    }),

    promotion_reports: promotionReports.map(AttractionZPromotionReportDTO),

    total_reports: {
      ...totalReports,
      tariff_reports: CombineAttractionTariffReportsDTO(tariffReports),
    },
  };
};

/*
|--------------------------------------------------------------------------
| ACCOUNTING REPORTS
|--------------------------------------------------------------------------
*/

export const AccountingAttractionReportsDTO = (data: {
  start_date: Date;
  end_date: Date;

  promotion_code: string | null;
  promotion_codes: string[];

  attractions: AttractionModelI[];
  reports: AttractionReportModelI[];

  promotion_reports: PromotionReportPlain[];
}): AccountingAttractionReportsResponseDTO => {
  const totals = emptyAttractionZReportsTotals();

  const reportsByAttraction = new Map<number, AttractionReportModelI[]>();

  const promotionReportsByAttraction = new Map<
    number,
    PromotionReportPlain[]
  >();

  /*
   * CONFIRMED ZReportlarni attraction bo‘yicha ajratamiz.
   */
  for (const report of data.reports) {
    const attractionID = Number(report.attraction);

    if (!Number.isInteger(attractionID) || attractionID <= 0) {
      continue;
    }

    const currentReports = reportsByAttraction.get(attractionID) ?? [];

    currentReports.push(report);

    reportsByAttraction.set(attractionID, currentReports);

    addAttractionZReportsTotals(totals, report);
  }

  /*
   * Promotion reportlarni attraction bo‘yicha ajratamiz.
   */
  for (const report of data.promotion_reports) {
    const attractionID = Number(report.attraction);

    if (!Number.isInteger(attractionID) || attractionID <= 0) {
      continue;
    }

    const currentReports = promotionReportsByAttraction.get(attractionID) ?? [];

    currentReports.push(report);

    promotionReportsByAttraction.set(attractionID, currentReports);

    addPromotionToAttractionZReportsTotals(totals, report);
  }

  const attractions: AttractionZReportAttractionResponseDTO[] =
    data.attractions.map(
      (attraction) => {
        const attractionID = Number(attraction.id);
        const totalReports = emptyAttractionZReportsTotals();
        const attractionReports = reportsByAttraction.get(attractionID) ?? [];
        const attractionPromotionReports =
          promotionReportsByAttraction.get(attractionID) ?? [];

        for (const report of attractionReports) {
          addAttractionZReportsTotals(totalReports, report);
        }

        for (const promotionReport of attractionPromotionReports) {
          addPromotionToAttractionZReportsTotals(
            totalReports,
            promotionReport,
          );
        }

        return {
          id: attractionID,

          name: attraction.name,

          manufacturer: attraction.manufacturer ?? null,

          status: attraction.status,

          dashboard_file:
            attraction.dashboard_file !== null &&
            attraction.dashboard_file !== undefined
              ? Number(attraction.dashboard_file)
              : null,

          main_file:
            attraction.main_file !== null && attraction.main_file !== undefined
              ? Number(attraction.main_file)
              : null,

          files: Array.isArray(attraction.files)
            ? attraction.files.map(Number)
            : [],

          size: Number(attraction.size || 1),
          price:
            attraction.price === null ? null : Number(attraction.price),
          duration: Number(attraction.duration || 0),
          seats: Number(attraction.seats || 0),

          age_limit: Number(attraction.age_limit || 0),
          min_height: Number(attraction.min_height || 0),
          max_weight: Number(attraction.max_weight || 0),

          description: attraction.description ?? null,

          zreports: attractionReports.map((report) => {
            const {
              promotion_reports: _promotionReports,
              ...zreport
            } = AttractionReportDTO(report);

            return zreport;
          }),

          promotion_reports:
            attractionPromotionReports.map(PromotionReportDTO),

          total_reports: totalReports,
        };
      },
    );

  const stats = {
    total: data.reports.length,
    open: 0,
    stopped: 0,
    waiting: 0,
    confirmed: data.reports.length,
  };
  return {
    start_date: data.start_date,
    end_date: data.end_date,

    promotion_code: data.promotion_code,
    promotion_codes: data.promotion_codes,

    stats,

    totals,

    attractions,
  };
};
