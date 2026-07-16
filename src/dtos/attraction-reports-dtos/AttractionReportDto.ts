export const AttractionReportOperatorDTO = (
  data: AttractionReportOperatorDTO | null | undefined,
) => {
  if (!data) {
    return null;
  }

  return {
    id: Number(data.id),
    firstname: data.firstname,
    lastname: data.lastname,
    file: data.file !== null ? Number(data.file) : null,
  };
};

export const AttractionReportDTO = (
  data: AttractionReportWithOperatorPlain,
) => {
  const operator =
    data.operators !== undefined
      ? AttractionReportOperatorDTO(data.operators)
      : Number(data.operator);

  return {
    id: Number(data.id),

    attraction: Number(data.attraction),

    operator,

    report_type: data.report_type,

    zreport: data.zreport !== null ? Number(data.zreport) : null,

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

    total_offline: Number(data.total_offline || 0),
    total_online: Number(data.total_online || 0),
    total_virtual: Number(data.total_online || 0),
    total_classic: Number(data.total_online || 0),
    total_vip: Number(data.total_vip || 0),
    total_organization: Number(data.total_organization || 0),

    paid_amount: Number(data.paid_amount || 0),
    total_amount: Number(data.total_amount || 0),

    created_at: data.createdAt,
  };
};

export const AttractionReportsTodayDTO = (data: {
  zreport: AttractionReportWithOperatorPlain | null;
  xreports: AttractionReportWithOperatorPlain[];
}) => {
  return {
    zreport: data.zreport ? AttractionReportDTO(data.zreport) : null,
    xreports: data.xreports.map(AttractionReportDTO),
  };
};

export const emptyAttractionZReportsTotals = (): AttractionZReportTotalsDTO => {
  return {
    total_rounds: 0,
    total_people: 0,

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

export const addAttractionZReportsTotals = (
  target: AttractionZReportTotalsDTO,
  report: AttractionReportModelI,
) => {
  target.total_rounds += Number(report.total_rounds || 0);
  target.total_people += Number(report.total_people || 0);

  target.total_offline += Number(report.total_offline || 0);
  target.total_online += Number(report.total_online || 0);
  target.total_virtual += Number(report.total_online || 0);
  target.total_classic += Number(report.total_online || 0);
  target.total_vip += Number(report.total_vip || 0);
  target.total_organization += Number(report.total_organization || 0);

  target.paid_amount += Number(report.paid_amount || 0);
  target.total_amount += Number(report.total_amount || 0);
};

export const AttractionZReportAttractionDTO = (
  data: AttractionWithZReportsPlain,
) => {
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

    price: Number(data.price || 0),
    duration: Number(data.duration || 0),
    seats: Number(data.seats || 0),
    age_limit: Number(data.age_limit || 0),
    min_height: Number(data.min_height || 0),
    max_weight: Number(data.max_weight || 0),

    description: data.description ?? null,

    zreports: Array.isArray(data.reports)
      ? data.reports.map(AttractionReportDTO)
      : [],
  };
};

export const AccountingAttractionReportsDTO = (data: {
  start_date: Date;
  end_date: Date;
  attractions: AttractionModelI[];
  reports: AttractionReportModelI[];
}): AccountingAttractionReportsResponseDTO => {
  const totals = emptyAttractionZReportsTotals();

  const attractions: AccountingAttractionReportDTO[] = data.attractions.map(
    (attraction) => {
      const zreport = emptyAttractionZReportsTotals();

      const reports = data.reports.filter(
        (report) => Number(report.attraction) === Number(attraction.id),
      );

      for (const report of reports) {
        addAttractionZReportsTotals(zreport, report);
        addAttractionZReportsTotals(totals, report);
      }

      return {
        attraction: {
          id: Number(attraction.id),
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

          price: Number(attraction.price || 0),
          duration: Number(attraction.duration || 0),
          seats: Number(attraction.seats || 0),
          age_limit: Number(attraction.age_limit || 0),
          min_height: Number(attraction.min_height || 0),
          max_weight: Number(attraction.max_weight || 0),

          description: attraction.description ?? null,
        },

        zreport,
      };
    },
  );

  return {
    start_date: data.start_date,
    end_date: data.end_date,
    totals,
    attractions,
  };
};
