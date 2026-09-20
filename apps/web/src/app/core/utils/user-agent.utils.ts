export interface Device {
  browser: string | null;
  platform: string | null;
}

const BROWSERS: [RegExp, string][] = [
  [/\bEdg(?:e|A|iOS)?\//, 'Edge'],
  [/\bOPR\/|\bOpera\//, 'Opera'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\bFirefox\/|\bFxiOS\//, 'Firefox'],
  [/\bCriOS\//, 'Chrome'],
  [/\bChrome\//, 'Chrome'],
  [/\bSafari\//, 'Safari'],
];

const PLATFORMS: [RegExp, string][] = [
  [/\bWindows\b/, 'Windows'],
  [/\bAndroid\b/, 'Android'],
  [/\biPhone\b/, 'iPhone'],
  [/\biPad\b/, 'iPad'],
  [/\bMacintosh\b|\bMac OS X\b/, 'macOS'],
  [/\bCrOS\b/, 'ChromeOS'],
  [/\bLinux\b/, 'Linux'],
];

const firstMatch = (userAgent: string, table: [RegExp, string][]): string | null =>
  table.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;

export const describeUserAgent = (userAgent: string | null | undefined): Device => {
  if (!userAgent) {
    return { browser: null, platform: null };
  }

  return { browser: firstMatch(userAgent, BROWSERS), platform: firstMatch(userAgent, PLATFORMS) };
};
