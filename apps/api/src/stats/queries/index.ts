import { GetBarStatsHandler } from './get-bar-stats/get-bar-stats.handler';

export * from './get-bar-stats/get-bar-stats.handler';
export * from './get-bar-stats/get-bar-stats.query';

export const StatsQueryHandlers = [GetBarStatsHandler];
