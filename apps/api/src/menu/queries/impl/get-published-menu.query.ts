export class GetPublishedMenuQuery {
  constructor(
    public readonly slug: string,
    public readonly language?: string,
  ) {}
}
