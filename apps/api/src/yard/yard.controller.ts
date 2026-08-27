import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { YardService } from './yard.service';
import { DogDto, HoldDto, ReviewDto } from './yard.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';

@ApiTags('yard')
@Controller()
export class YardController {
  constructor(private readonly yard: YardService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('groups')
  listGroups() {
    return this.yard.listGroups();
  }

  @Get('groups/:id')
  getGroup(@Param('id') id: string) {
    return this.yard.getGroup(id);
  }

  @Get('groups/:id/slots')
  slots(@Param('id') id: string, @Query('date') date?: string) {
    return this.yard.groupSlots(id, date);
  }

  @Get('groups/:id/reviews')
  groupReviews(@Param('id') id: string) {
    return this.yard.groupReviews(id);
  }

  @Get('addons')
  addons() {
    return this.yard.listAddons();
  }

  @Get('yard-days/:date')
  yardDay(@Param('date') date: string) {
    return this.yard.getYardDay(date);
  }

  @Get('dogs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  dogs(@CurrentUser() user: { userId: string }) {
    return this.yard.listDogs(user.userId);
  }

  @Post('dogs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  createDog(@CurrentUser() user: { userId: string }, @Body() dto: DogDto) {
    return this.yard.createDog(user.userId, dto);
  }

  @Get('dogs/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getDog(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.yard.getDog(user.userId, id);
  }

  @Patch('dogs/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  patchDog(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() dto: Partial<DogDto>) {
    return this.yard.patchDog(user.userId, id, dto as any);
  }

  @Delete('dogs/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deleteDog(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.yard.deleteDog(user.userId, id);
  }

  @Post('bookings/hold')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  hold(@CurrentUser() user: { userId: string }, @Body() dto: HoldDto) {
    return this.yard.hold(user.userId, dto);
  }

  @Post('bookings/:id/confirm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  confirm(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.yard.confirm(user.userId, id);
  }

  @Post('bookings/:id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.yard.cancel(user.userId, id);
  }

  @Get('bookings/ticket/:code')
  ticket(@Param('code') code: string) {
    return this.yard.getTicket(code);
  }

  @Get('bookings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listBookings(@CurrentUser() user: { userId: string }) {
    return this.yard.listBookings(user.userId);
  }

  @Get('bookings/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getBooking(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.yard.getBooking(user.userId, id);
  }

  @Post('reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  review(@CurrentUser() user: { userId: string }, @Body() dto: ReviewDto) {
    return this.yard.createReview(user.userId, dto);
  }
}
