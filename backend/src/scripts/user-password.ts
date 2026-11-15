import * as bcrypt from 'bcryptjs';

function withPepper(password: string): string {
  return `${password}${process.env.BCRYPT_PEPPER || ''}`;
}

export async function hashUserPassword(password: string): Promise<string> {
  return bcrypt.hash(withPepper(password), 12);
}

export async function verifyUserPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(withPepper(password), hash);
}
