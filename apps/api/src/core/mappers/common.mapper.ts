export const commonMapper = {
  getSuccessResponse: <T extends Record<string, any>>(extra?: T): { success: boolean } & T =>
    ({
      success: true,
      ...extra,
    }) as { success: boolean } & T,
};
