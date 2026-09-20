import { describe, expect, it } from 'vitest';
import { describeUserAgent } from './user-agent.utils';

describe('describeUserAgent', () => {
  it('should recognise Chrome on Windows', () => {
    expect(
      describeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      ),
    ).toEqual({ browser: 'Chrome', platform: 'Windows' });
  });

  it('should recognise Safari on a Mac, which says Safari last of all', () => {
    expect(
      describeUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
      ),
    ).toEqual({ browser: 'Safari', platform: 'macOS' });
  });

  it('should not take Edge for Chrome, which it claims to be', () => {
    expect(
      describeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
      ).browser,
    ).toBe('Edge');
  });

  it('should call Chrome on an iPhone Chrome, however Apple makes it render', () => {
    expect(
      describeUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
      ),
    ).toEqual({ browser: 'Chrome', platform: 'iPhone' });
  });

  it('should recognise Firefox on Android', () => {
    expect(describeUserAgent('Mozilla/5.0 (Android 15; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0')).toEqual({
      browser: 'Firefox',
      platform: 'Android',
    });
  });

  it('should admit to knowing nothing rather than guess', () => {
    expect(describeUserAgent('curl/8.7.1')).toEqual({ browser: null, platform: null });
    expect(describeUserAgent(null)).toEqual({ browser: null, platform: null });
    expect(describeUserAgent('')).toEqual({ browser: null, platform: null });
  });
});
