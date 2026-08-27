import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { YardService } from './yard.service';
import { CodeDto, YardPatchDto } from './yard.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly yard: YardService) {}

  @Post('check-in')
  checkIn(@Body() dto: CodeDto) {
    return this.yard.checkIn(dto.codeOrUrl);
  }

  @Post('check-out')
  checkOut(@Body() dto: CodeDto) {
    return this.yard.checkOut(dto.codeOrUrl);
  }

  @Get('pack')
  pack() {
    return this.yard.pack();
  }

  @Get('stats')
  stats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.yard.stats(from, to);
  }

  @Patch('yard-days/:date')
  patchDay(@Param('date') date: string, @Body() dto: YardPatchDto) {
    return this.yard.patchYardDay(date, dto);
  }
}
