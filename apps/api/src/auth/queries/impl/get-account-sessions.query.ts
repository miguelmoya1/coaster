export class GetAccountSessionsQuery {
  constructor(
    public readonly userId: string,
    public readonly currentSessionId: string | null,
  ) {}
}
