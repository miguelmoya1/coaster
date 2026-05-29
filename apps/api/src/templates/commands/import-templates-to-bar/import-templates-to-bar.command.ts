import { ImportTemplatesDto } from '../../dto/import-templates.dto';

export class ImportTemplatesToBarCommand {
  constructor(
    public readonly barId: string,
    public readonly dto: ImportTemplatesDto,
  ) {}
}
