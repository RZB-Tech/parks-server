import { Transaction } from "sequelize";
import { PromotionReportModel } from "../../models/postgresql/promotion-reports-model/PromotionReportsModel";
import { getTashkentDateOnly } from "../../utils/date";

export const UpsertPromotionReportService = async (
  data: UpsertPromotionReportData,
  transaction: Transaction,
) => {
  const promotionKey = data.promotion
    ? [
        "promotion",
        data.promotion,
        data.discount_percent,
        data.original_unit_price,
        data.sale_unit_price,
      ].join(":")
    : `classic:${data.original_unit_price}`;

  await PromotionReportModel.sequelize!.query(
    `
      INSERT INTO promotion_reports (
        report_date,

        attraction,
        xreport,
        zreport,

        promotion,
        promotion_key,

        promotion_code,
        promotion_name,
        promotion_type,

        promotion_started_at,
        promotion_ended_at,

        discount_percent,

        original_unit_price,
        sale_unit_price,

        rounds_count,
        total_people,

        total_virtual,
        total_classic,
        total_vip,
        total_organization,

        total_online,
        total_offline,

        original_amount,
        discount_amount,
        paid_amount,

        created_at,
        updated_at
      )
      VALUES (
        :reportDate,

        :attraction,
        :xreport,
        :zreport,

        :promotion,
        :promotionKey,

        :promotionCode,
        :promotionName,
        :promotionType,

        :promotion_started_at,        
        :promotion_ended_at,        


        :discountPercent,

        :originalUnitPrice,
        :saleUnitPrice,

        1,
        :peopleCount,

        :totalVirtual,
        :totalClassic,
        :totalVip,
        :totalOrganization,

        :totalOnline,
        :totalOffline,

        :originalAmount,
        :discountAmount,
        :paidAmount,

        NOW(),
        NOW()
      )

      ON CONFLICT (xreport, promotion_key)

      DO UPDATE SET
        promotion_code =
          EXCLUDED.promotion_code,

        promotion_name =
          EXCLUDED.promotion_name,

        promotion_type =
          EXCLUDED.promotion_type,
        promotion_started_at =
          EXCLUDED.promotion_started_at,
        promotion_ended_at =
          EXCLUDED.promotion_ended_at,

        rounds_count =
          promotion_reports.rounds_count + 1,

        total_people =
          promotion_reports.total_people +
          EXCLUDED.total_people,

        total_virtual =
          promotion_reports.total_virtual +
          EXCLUDED.total_virtual,

        total_classic =
          promotion_reports.total_classic +
          EXCLUDED.total_classic,

        total_vip =
          promotion_reports.total_vip +
          EXCLUDED.total_vip,

        total_organization =
          promotion_reports.total_organization +
          EXCLUDED.total_organization,

        total_online =
          promotion_reports.total_online +
          EXCLUDED.total_online,

        total_offline =
          promotion_reports.total_offline +
          EXCLUDED.total_offline,

        original_amount =
          promotion_reports.original_amount +
          EXCLUDED.original_amount,

        discount_amount =
          promotion_reports.discount_amount +
          EXCLUDED.discount_amount,

        paid_amount =
          promotion_reports.paid_amount +
          EXCLUDED.paid_amount,

        updated_at = NOW()
    `,
    {
      replacements: {
        reportDate: getTashkentDateOnly(new Date()),

        attraction: data.attraction,

        xreport: data.xreport,
        zreport: data.zreport,

        promotion: data.promotion,
        promotionKey,

        promotionCode: data.promotion_code,

        promotionName: data.promotion_name,

        promotionType: data.promotion_type,
        promotion_started_at: data.promotion_started_at,
        promotion_ended_at: data.promotion_ended_at,

        discountPercent: data.discount_percent,

        originalUnitPrice: data.original_unit_price,

        saleUnitPrice: data.sale_unit_price,

        peopleCount: data.people_count,

        totalVirtual: data.total_virtual,

        totalClassic: data.total_classic,

        totalVip: data.total_vip,

        totalOrganization: data.total_organization,

        totalOnline: data.total_online,

        totalOffline: data.total_offline,

        originalAmount: data.original_amount,

        discountAmount: data.discount_amount,

        paidAmount: data.paid_amount,
      },

      transaction,
    },
  );
};
