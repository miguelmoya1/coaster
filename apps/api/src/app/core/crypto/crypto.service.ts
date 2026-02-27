import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcrypt';

@Injectable()
export class CryptoService {
  public async hash(password: string) {
    return hash(password, 10);
  }

  public async compare(password: string, hash: string) {
    return compare(password, hash);
  }
}
