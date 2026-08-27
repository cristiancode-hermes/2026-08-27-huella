import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities/entities';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { YardModule } from '../yard/yard.module';

@Module({
  imports: [TypeOrmModule.forFeature(ALL_ENTITIES), YardModule],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
