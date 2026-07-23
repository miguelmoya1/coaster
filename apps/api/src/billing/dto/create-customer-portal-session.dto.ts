import { IsUrl } from 'class-validator';

export class CreateCustomerPortalSessionDto {
  @IsUrl({ require_tld: false })
  returnUrl!: string;
}
