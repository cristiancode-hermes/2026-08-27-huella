import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities/entities';
import { YardService } from './yard.service';
import { YardController } from './yard.controller';
import { StaffController } from './staff.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature(ALL_ENTITIES), AuthModule],
  controllers: [YardController, StaffController],
  providers: [YardService],
  exports: [YardService],
})
export class YardModule {}
