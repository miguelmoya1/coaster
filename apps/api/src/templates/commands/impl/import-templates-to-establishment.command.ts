import { ImportTemplatesDto } from '../../dto/import-templates.dto';

export class ImportTemplatesToEstablishmentCommand {
  constructor(
    public readonly establishmentId: string,
    public readonly dto: ImportTemplatesDto,
  ) {}
}
