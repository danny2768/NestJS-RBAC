import { compareSync, genSaltSync, hashSync } from 'bcryptjs';

export class BcryptAdapter {
  public static hash(password: string): string {
    const salt = genSaltSync();
    return hashSync(password, salt);
  }

  public static compare(password: string, hash: string): boolean {
    return compareSync(password, hash);
  }
}

export default BcryptAdapter;
