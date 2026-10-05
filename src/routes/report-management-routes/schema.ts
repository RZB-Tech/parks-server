import { successAnswerTemplate } from "../schemas";

export const forceCloseReportsSchema = {
  summary: "Force close active reports",
  description:
    "Close every open or stopped X and Z report for a physical cashbox or attraction, regardless of report operator. Open attraction rounds are finalized first.",
  tags: ["Report management route"],
  params: {
    type: "object",
    required: ["source", "sourceID"],
    additionalProperties: false,
    properties: {
      source: {
        type: "string",
        enum: ["cashbox", "attraction"],
      },
      sourceID: {
        type: "integer",
        minimum: 1,
        description: "Cashbox or attraction ID",
      },
    },
  },
  response: {
    200: successAnswerTemplate({
      "force-close-result": {
        type: "object",
        required: [
          "source",
          "source_id",
          "closed_xreports",
          "closed_zreports",
          "finalized_rounds",
          "target_status",
          "closed_at",
        ],
        additionalProperties: false,
        properties: {
          source: {
            type: "string",
            enum: ["cashbox", "attraction"],
          },
          source_id: { type: "number" },
          closed_xreports: { type: "number" },
          closed_zreports: { type: "number" },
          finalized_rounds: { type: "number" },
          target_status: { type: "string", enum: ["inactive"] },
          closed_at: { type: "string", format: "date-time" },
        },
      },
    }),
  },
};
