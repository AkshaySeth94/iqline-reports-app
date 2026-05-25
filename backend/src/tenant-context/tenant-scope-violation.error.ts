export class TenantScopeViolation extends Error {
  constructor(
    public readonly expectedLabId: string | null,
    public readonly offendingLabId: string | null,
    public readonly resource: string,
  ) {
    super(
      `Tenant scope violation: expected labId=${expectedLabId}, got labId=${offendingLabId} on ${resource}`,
    );
    this.name = 'TenantScopeViolation';
  }
}
