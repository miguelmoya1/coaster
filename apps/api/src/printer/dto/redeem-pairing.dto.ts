import { IsNotEmpty, IsString, Length } from 'class-validator';
import { PAIRING_CODE_LENGTH } from '../domain/pairing-code';

export class RedeemPairingDto {
  @IsString()
  @IsNotEmpty()
  @Length(PAIRING_CODE_LENGTH, PAIRING_CODE_LENGTH)
  declare code: string;
}
