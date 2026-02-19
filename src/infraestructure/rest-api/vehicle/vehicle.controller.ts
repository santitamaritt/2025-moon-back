import {
  Controller,
  Post,
  Body,
  Inject,
  Get,
  Put,
  Param,
  ParseIntPipe,
  Delete,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateVehicleDto } from '../../dtos/vehicle/create-vehicle.dto';
import {
  type IVehicleService,
  IVehicleServiceToken,
} from 'src/domain/interfaces/vehicle-service.interface';
import { AuthenticatedUser } from '../decorators/authenticated-user.decorator';
import type { JwtPayload } from 'src/infraestructure/dtos/shared/jwt-payload.interface';
import { UpdateVehicleDto } from 'src/infraestructure/dtos/vehicle/update-vehicle.dto';
import { AuthenticatedWorkshop } from '../decorators/authenticated-mechanic.decorator';
import { UpdateVehicleStatusDto } from 'src/infraestructure/dtos/vehicle/update-vehicle-status.dto';

@Controller('vehicle')
export class VehicleController {
  constructor(
    @Inject(IVehicleServiceToken)
    private readonly vehicleService: IVehicleService,
  ) {}

  @Get('/user')
  getVehiclesOfUser(@AuthenticatedUser() user: JwtPayload) {
    return this.vehicleService.getVehiclesOfUser(user.id);
  }

  @Delete(':id')
  async deleteVehiclesOfUser(
    @Param('id') id: number,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    const vehicle = await this.vehicleService.getById(id);
    if (vehicle.userId !== user.id) {
      throw new UnauthorizedException(
        'You do not have permission to delete this vehicle',
      );
    }
    return this.vehicleService.delete(vehicle);
  }

  @Put(':id')
  updateVehicleOfUser(
    @AuthenticatedUser() user: JwtPayload,
    @Param('id', new ParseIntPipe()) id: number,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehicleService.updateVehicleOfUser(user.id, id, dto);
  }

  @Put(':id/status')
  updateVehicleStatusAsMechanic(
    @AuthenticatedWorkshop() _mechanic: JwtPayload,
    @Param('id', new ParseIntPipe()) id: number,
    @Body() dto: UpdateVehicleStatusDto,
  ) {
    return this.vehicleService.updateVehicleStatusByMechanic(id, dto.status);
  }

  @Post()
  create(@AuthenticatedUser() user: JwtPayload, @Body() dto: CreateVehicleDto) {
    return this.vehicleService.create(
      user,
      dto.licensePlate,
      dto.model,
      dto.year,
      dto.km,
    );
  }
}
