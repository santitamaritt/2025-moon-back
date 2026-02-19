export class VehicleKmUpdatedEvent {
  constructor(
    public readonly userId: number,
    public readonly vehicleId: number,
    public readonly km: number,
  ) {}
}
