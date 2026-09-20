export class CloseOtherSessionsCommand {
  constructor(
    public readonly userId: string,
    public readonly currentSessionId: string | null,
  ) {}
}
