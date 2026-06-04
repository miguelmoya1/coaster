export class UserInvitedEvent {
  constructor(
    public readonly inviterName: string,
    public readonly email: string,
    public readonly barName: string,
  ) {}
}
