import { Transaction } from "sequelize";
import { BadRequest, Conflict, NotFound } from "../../exceptions";
import { AttractionTariffModel } from "../../models/postgresql/attraction-tariff-model/AttractionTariffModel";
import { AttractionTariffStatusTypes } from "../../models/postgresql/attraction-tariff-model/enums";

interface NormalizedAttractionTariff {
  id?: number;
  name: string;
  price: number;
  sort_order: number;
}

export interface ResolvedAttractionPricing {
  price: number;
  tariff: AttractionTariffModel | null;
}

export const NormalizeAttractionTariffs = (
  tariffs: AttractionTariffInput[],
): NormalizedAttractionTariff[] => {
  if (!Array.isArray(tariffs) || tariffs.length === 0) {
    throw BadRequest("ATTRACTION_TARIFFS_ARE_REQUIRED");
  }

  const normalizedTariffs = tariffs.map((tariff, index) => {
    const id = tariff.id === undefined ? undefined : Number(tariff.id);
    const name = tariff.name?.trim();
    const price = Number(tariff.price);

    if (id !== undefined && (!Number.isInteger(id) || id <= 0)) {
      throw BadRequest("ATTRACTION_TARIFF_ID_IS_INVALID");
    }

    if (!name) {
      throw BadRequest("ATTRACTION_TARIFF_NAME_IS_REQUIRED");
    }

    if (name.length > 100) {
      throw BadRequest("ATTRACTION_TARIFF_NAME_IS_TOO_LONG");
    }

    if (!Number.isSafeInteger(price) || price < 0) {
      throw BadRequest("ATTRACTION_TARIFF_PRICE_IS_INVALID");
    }

    return {
      ...(id !== undefined ? { id } : {}),
      name,
      price,
      sort_order: index,
    };
  });

  const uniqueNames = new Set(
    normalizedTariffs.map((tariff) => tariff.name.toLowerCase()),
  );
  const ids = normalizedTariffs
    .map((tariff) => tariff.id)
    .filter((id): id is number => id !== undefined);

  if (uniqueNames.size !== normalizedTariffs.length) {
    throw Conflict("ATTRACTION_TARIFF_NAMES_MUST_BE_UNIQUE");
  }

  if (new Set(ids).size !== ids.length) {
    throw Conflict("ATTRACTION_TARIFF_IDS_MUST_BE_UNIQUE");
  }

  return normalizedTariffs;
};

export const CreateAttractionTariffsService = async (
  attractionID: number,
  tariffs: AttractionTariffInput[],
  transaction: Transaction,
) => {
  const normalizedTariffs = NormalizeAttractionTariffs(tariffs);

  return AttractionTariffModel.bulkCreate(
    normalizedTariffs.map((tariff) => ({
      attraction: attractionID,
      name: tariff.name,
      price: tariff.price,
      status: AttractionTariffStatusTypes.ACTIVE,
      sort_order: tariff.sort_order,
    })),
    { transaction },
  );
};

export const SyncAttractionTariffsService = async (
  attractionID: number,
  tariffs: AttractionTariffInput[],
  transaction: Transaction,
) => {
  const normalizedTariffs = NormalizeAttractionTariffs(tariffs);
  const existingTariffs = await AttractionTariffModel.findAll({
    where: { attraction: attractionID },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  const resolvedTariffs = normalizedTariffs.map((tariffData) => {
    const tariffsWithSameName = existingTariffs.filter(
      (existingTariff) =>
        existingTariff.name.toLowerCase() === tariffData.name.toLowerCase(),
    );
    const tariff = tariffData.id
      ? existingTariffs.find(
          (existingTariff) => Number(existingTariff.id) === tariffData.id,
        )
      : (tariffsWithSameName.find(
          (existingTariff) =>
            existingTariff.status === AttractionTariffStatusTypes.ACTIVE,
        ) ?? tariffsWithSameName[0]);

    if (tariffData.id && !tariff) {
      throw NotFound("ATTRACTION_TARIFF_NOT_FOUND");
    }

    return { tariffData, tariff };
  });

  for (const existingTariff of existingTariffs) {
    if (existingTariff.status === AttractionTariffStatusTypes.ACTIVE) {
      await existingTariff.update(
        { status: AttractionTariffStatusTypes.INACTIVE },
        { transaction },
      );
    }
  }

  for (const { tariffData, tariff } of resolvedTariffs) {

    if (tariff) {
      await tariff.update(
        {
          name: tariffData.name,
          price: tariffData.price,
          status: AttractionTariffStatusTypes.ACTIVE,
          sort_order: tariffData.sort_order,
        },
        { transaction },
      );
      continue;
    }

    await AttractionTariffModel.create(
      {
        attraction: attractionID,
        name: tariffData.name,
        price: tariffData.price,
        status: AttractionTariffStatusTypes.ACTIVE,
        sort_order: tariffData.sort_order,
      },
      { transaction },
    );
  }

  return AttractionTariffModel.findAll({
    where: {
      attraction: attractionID,
      status: AttractionTariffStatusTypes.ACTIVE,
    },
    order: [
      ["sort_order", "ASC"],
      ["id", "ASC"],
    ],
    transaction,
  });
};

export const DeactivateAttractionTariffsService = async (
  attractionID: number,
  transaction: Transaction,
) => {
  await AttractionTariffModel.update(
    { status: AttractionTariffStatusTypes.INACTIVE },
    {
      where: {
        attraction: attractionID,
        status: AttractionTariffStatusTypes.ACTIVE,
      },
      transaction,
    },
  );
};

export const ResolveAttractionPricingService = async (
  attraction: Pick<AttractionModelI, "id" | "price">,
  tariffID: number | undefined,
  transaction: Transaction,
): Promise<ResolvedAttractionPricing> => {
  if (attraction.price !== null && attraction.price !== undefined) {
    const price = Number(attraction.price);

    if (!Number.isSafeInteger(price) || price < 0) {
      throw BadRequest("ATTRACTION_PRICE_IS_INVALID");
    }

    if (tariffID !== undefined && tariffID !== null) {
      throw BadRequest("ATTRACTION_DOES_NOT_USE_TARIFFS");
    }

    return { price, tariff: null };
  }

  const parsedTariffID = Number(tariffID);

  if (!Number.isInteger(parsedTariffID) || parsedTariffID <= 0) {
    throw BadRequest("ATTRACTION_TARIFF_ID_IS_REQUIRED");
  }

  const tariff = await AttractionTariffModel.findOne({
    where: {
      id: parsedTariffID,
      attraction: Number(attraction.id),
      status: AttractionTariffStatusTypes.ACTIVE,
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!tariff) {
    throw NotFound("ATTRACTION_TARIFF_NOT_FOUND");
  }

  const price = Number(tariff.price);

  if (!Number.isSafeInteger(price) || price < 0) {
    throw BadRequest("ATTRACTION_TARIFF_PRICE_IS_INVALID");
  }

  return { price, tariff };
};
