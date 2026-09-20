export class CloseSessionCommand {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly currentSessionId: string | null,
  ) {}
}
