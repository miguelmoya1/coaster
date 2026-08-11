/**
 * How many assistant messages a month a flat fee has to cover.
 *
 * The context budget caps what one message costs; this caps how many of them arrive. Sized against
 * the measured cost of a message in a large establishment, so the worst case is a small fraction of
 * the subscription rather than a surprise. Both are environment variables: the numbers below are a
 * starting point, not a finding.
 */
export const DEFAULT_MONTHLY_AI_MESSAGES = 500;

/** Lower while nobody is paying, which is also where someone would farm it by signing up again. */
export const DEFAULT_TRIAL_AI_MESSAGES = 100;
