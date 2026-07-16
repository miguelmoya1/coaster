import { IsUrl } from 'class-validator';

export class CreateCustomerPortalSessionDto {
  @IsUrl()
  returnUrl!: string;
}
