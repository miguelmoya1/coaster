export enum BarRole {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}

export enum ShiftType {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  NIGHT = 'NIGHT',
  SPLIT = 'SPLIT',
}

export enum ProductStatus {
  OK = 'OK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export const asBarRole = (role: string): BarRole => {
  if (Object.values(BarRole).includes(role as BarRole)) {
    return role as BarRole;
  }
  console.warn(`Invalid BarRole mapping: ${role}, defaulting to STAFF`);
  return BarRole.STAFF;
};

export const asShiftType = (type: string): ShiftType => {
  if (Object.values(ShiftType).includes(type as ShiftType)) {
    return type as ShiftType;
  }
  console.warn(`Invalid ShiftType mapping: ${type}, defaulting to MORNING`);
  return ShiftType.MORNING;
};

export const asProductStatus = (status: string): ProductStatus => {
  if (Object.values(ProductStatus).includes(status as ProductStatus)) {
    return status as ProductStatus;
  }
  console.warn(`Invalid ProductStatus mapping: ${status}, defaulting to OK`);
  return ProductStatus.OK;
};
