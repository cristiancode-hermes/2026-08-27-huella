import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Addon,
  Booking,
  BookingLine,
  Dog,
  PlayGroup,
  Slot,
  User,
} from '../entities/entities';
import { YardService } from '../yard/yard.service';
import { addMadridDays, madridToday, vaccinesReady } from '../common/time';
import { buildPassQrSvg, makeCode, passUrl } from '../common/qr';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Dog) private readonly dogs: Repository<Dog>,
    @InjectRepository(PlayGroup) private readonly groups: Repository<PlayGroup>,
    @InjectRepository(Slot) private readonly slots: Repository<Slot>,
    @InjectRepository(Addon) private readonly addons: Repository<Addon>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
    private readonly yard: YardService,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_DB === 'false') return;
    await this.seed();
  }

  async seed() {
    if (await this.users.count()) {
      await this.yard.seedCalendarIfNeeded();
      return { ok: true, skipped: true };
    }

    const hash = await bcrypt.hash('Huella2026!', 10);
    const nora = (await this.users.save({
      username: 'nora',
      email: 'nora@huella.test',
      passwordHash: hash,
      role: 'tutor',
      points: 10,
    } as any)) as User;
    await this.users.save({
      username: 'staff',
      email: 'staff@huella.test',
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any);
    await this.users.save({
      username: 'leo',
      email: 'leo@huella.test',
      passwordHash: hash,
      role: 'tutor',
      points: 0,
    } as any);

    const groups = (await this.groups.save([
      {
        slug: 'pequenos',
        name: 'Manada Pequeños',
        size: 'S',
        capacity: 8,
        priceCents: 2800,
        description: 'Patio bajo, túneles de mimbre y siesta a la sombra del seto.',
        photoUrl: '/assets/patio-pequenos.svg',
        sortOrder: 1,
      },
      {
        slug: 'medianos',
        name: 'Manada Medianos',
        size: 'M',
        capacity: 10,
        priceCents: 3000,
        description: 'Pradera de grava y estanque seco. Juego social a ritmo de patio.',
        photoUrl: '/assets/patio-medianos.svg',
        sortOrder: 2,
      },
      {
        slug: 'grandes',
        name: 'Manada Grandes',
        size: 'L',
        capacity: 8,
        priceCents: 3200,
        description: 'Corral amplio, palos de sauce y sombra de chopo.',
        photoUrl: '/assets/patio-grandes.svg',
        sortOrder: 3,
      },
    ] as any[])) as PlayGroup[];

    const drop = ['08:00', '09:00', '10:00'];
    const pick = ['16:00', '17:00', '18:00', '19:00'];
    for (const g of groups) {
      for (const t of drop) {
        await this.slots.save({
          playGroupId: g.id,
          kind: 'drop_off',
          startTime: t,
          label: `Entrada ${t}`,
        } as any);
      }
      for (const t of pick) {
        await this.slots.save({
          playGroupId: g.id,
          kind: 'pick_up',
          startTime: t,
          label: `Recogida ${t}`,
        } as any);
      }
    }

    await this.addons.save([
      { slug: 'bath', name: 'Baño al recoger', priceCents: 1200, active: true },
      { slug: 'extra_walk', name: 'Paseo extra', priceCents: 800, active: true },
      { slug: 'extra_hour', name: 'Hora extra', priceCents: 600, active: true },
    ] as any[]);

    const far = addMadridDays(madridToday(), 400);
    const nala = (await this.dogs.save({
      userId: nora.id,
      name: 'Nala',
      size: 'M',
      vaccines: { rabiesUntil: far, polyvalentUntil: far },
      temperament: 'playful',
      photoUrl: '/assets/dog-nala.svg',
      ready: true,
    } as any)) as Dog;
    await this.dogs.save({
      userId: nora.id,
      name: 'Pipa',
      size: 'S',
      vaccines: { rabiesUntil: far, polyvalentUntil: far },
      temperament: 'social',
      photoUrl: '/assets/dog-pipa.svg',
      ready: true,
    } as any);
    await this.dogs.save({
      userId: nora.id,
      name: 'Bruno',
      size: 'L',
      vaccines: { rabiesUntil: '2020-01-01', polyvalentUntil: '2020-01-01' },
      temperament: 'shy',
      photoUrl: '/assets/dog-bruno.svg',
      ready: vaccinesReady({ rabiesUntil: '2020-01-01', polyvalentUntil: '2020-01-01' }),
    } as any);

    await this.yard.seedCalendarIfNeeded();

    const med = groups.find((g) => g.slug === 'medianos')!;
    const dropSlot = await this.slots.findOne({ where: { playGroupId: med.id, kind: 'drop_off', startTime: '09:00' } });
    const pickSlot = await this.slots.findOne({ where: { playGroupId: med.id, kind: 'pick_up', startTime: '18:00' } });
    const yesterday = addMadridDays(madridToday(), -1);
    const code = makeCode();
    const url = passUrl(code);
    const svg = await buildPassQrSvg(url, code);
    const past = (await this.bookings.save({
      userId: nora.id,
      dogId: nala.id,
      playGroupId: med.id,
      visitDate: yesterday,
      dropOffSlotId: dropSlot!.id,
      pickUpSlotId: pickSlot!.id,
      status: 'picked_up',
      expiresAt: null,
      code,
      qrUrl: url,
      qrSvg: svg,
      totalCents: 3000,
      checkedInAt: new Date(),
      pickedUpAt: new Date(),
    } as any)) as Booking;
    await this.lines.save({
      bookingId: past.id,
      kind: 'day',
      addonId: null,
      label: `Día en ${med.name}`,
      qty: 1,
      unitCents: 3000,
      subtotalCents: 3000,
    } as any);

    return { ok: true };
  }
}
