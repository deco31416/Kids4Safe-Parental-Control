import { timingSafeEqual } from 'crypto';

export function validateRecorderServiceToken(
  suppliedToken: string | undefined,
  expectedToken: string | undefined,
) {
  if (!suppliedToken || !expectedToken) return false;

  const supplied = Buffer.from(suppliedToken, 'utf8');
  const expected = Buffer.from(expectedToken, 'utf8');

  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
