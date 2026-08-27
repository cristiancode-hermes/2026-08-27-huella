import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ConflictException } from '@nestjs/common';
import {
  ALL_ENTITIES,
  Addon,
  Booking,
  Dog,
  PlayGroup,
  Slot,
  User,
  YardDay,
} from './entities/entities';
import { YardService } from './yard/yard.service';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { addMadridDays, madridToday } from './common/time';
import { extractTicketCode, passUrl } from './common/qr';

process.env.WEB_ORIGIN = 'https://huella.proyectos.cristiancode.dev';
process.env.JWT_SECRET = 'test-secret';

function codeOf(err: unknown): string | undefined {
  if (err instanceof ConflictException) {
    const res = err.getResponse() as any;
    return res?.code || res?.message?.code;
  }
  return undefined;
}

describe('Huella yard', () => {
  let app: INestApplication;
  let yard: YardService;
  let auth: AuthService;
  let users: Repository<User>;
  let dogs: Repository<Dog>;
  let groups: Repository<PlayGroup>;
  let slots: Repository<Slot>;
  let addons: Repository<Addon>;
  let days: Repository<YardDay>;
  let nora: User;
  let leo: User;
  let staff: User;
  let nala: Dog;
  let pipa: Dog;
  let bruno: Dog;
  let med: PlayGroup;
  let small: PlayGroup;
  let drop: Slot;
  let pick: Slot;
  let visitDate: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: ALL_ENTITIES,
          synchronize: true,
        } as any),
        TypeOrmModule.forFeature(ALL_ENTITIES),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '7d' } }),
        AuthModule,
      ],
      providers: [YardService],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    yard = moduleRef.get(YardService);
    auth = moduleRef.get(AuthService);
    users = moduleRef.get(getRepositoryToken(User));
    dogs = moduleRef.get(getRepositoryToken(Dog));
    groups = moduleRef.get(getRepositoryToken(PlayGroup));
    slots = moduleRef.get(getRepositoryToken(Slot));
    addons = moduleRef.get(getRepositoryToken(Addon));
    days = moduleRef.get(getRepositoryToken(YardDay));

    const hash = await bcrypt.hash('Huella2026!', 10);
    nora = (await users.save({
      username: 'nora',
      email: 'nora@huella.test',
      passwordHash: hash,
      role: 'tutor',
      points: 0,
    } as any)) as User;
    leo = (await users.save({
      username: 'leo',
      email: 'leo@huella.test',
      passwordHash: hash,
      role: 'tutor',
      points: 0,
    } as any)) as User;
    staff = (await users.save({
      username: 'staff',
      email: 'staff@huella.test',
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any)) as User;

    const far = addMadridDays(madridToday(), 400);
    nala = (await dogs.save({
      userId: nora.id,
      name: 'Nala',
      size: 'M',
      vaccines: { rabiesUntil: far, polyvalentUntil: far },
      temperament: 'playful',
      photoUrl: '/assets/dog-nala.svg',
      ready: true,
    } as any)) as Dog;
    pipa = (await dogs.save({
      userId: nora.id,
      name: 'Pipa',
      size: 'S',
      vaccines: { rabiesUntil: far, polyvalentUntil: far },
      temperament: 'social',
      photoUrl: '/assets/dog-pipa.svg',
      ready: true,
    } as any)) as Dog;
    bruno = (await dogs.save({
      userId: nora.id,
      name: 'Bruno',
      size: 'L',
      vaccines: { rabiesUntil: '2020-01-01', polyvalentUntil: '2020-01-01' },
      temperament: 'shy',
      photoUrl: '/assets/dog-bruno.svg',
      ready: false,
    } as any)) as Dog;

    small = (await groups.save({
      slug: 'pequenos',
      name: 'Manada Pequeños',
      size: 'S',
      capacity: 1,
      priceCents: 2800,
      description: 'Patio bajo',
      photoUrl: '/assets/patio-pequenos.svg',
      sortOrder: 1,
    } as any)) as PlayGroup;
    med = (await groups.save({
      slug: 'medianos',
      name: 'Manada Medianos',
      size: 'M',
      capacity: 8,
      priceCents: 3000,
      description: 'Pradera',
      photoUrl: '/assets/patio-medianos.svg',
      sortOrder: 2,
    } as any)) as PlayGroup;

    drop = (await slots.save({
      playGroupId: med.id,
      kind: 'drop_off',
      startTime: '09:00',
      label: 'Entrada 09:00',
    } as any)) as Slot;
    pick = (await slots.save({
      playGroupId: med.id,
      kind: 'pick_up',
      startTime: '18:00',
      label: 'Recogida 18:00',
    } as any)) as Slot;
    await slots.save({
      playGroupId: small.id,
      kind: 'drop_off',
      startTime: '09:00',
      label: 'Entrada 09:00',
    } as any);
    await slots.save({
      playGroupId: small.id,
      kind: 'pick_up',
      startTime: '18:00',
      label: 'Recogida 18:00',
    } as any);

    await addons.save({ slug: 'bath', name: 'Baño', priceCents: 1200, active: true } as any);

    visitDate = addMadridDays(madridToday(), 2);
    await days.save({ date: visitDate, status: 'open', note: null, capacityOverride: null } as any);
  });

  afterAll(async () => {
    await app.close();
  });

  it('login acepta username o email', async () => {
    const a = await auth.login({ identifier: 'nora', password: 'Huella2026!' });
    const b = await auth.login({ identifier: 'nora@huella.test', password: 'Huella2026!' });
    expect(a.accessToken).toBeTruthy();
    expect(b.user.email).toBe('nora@huella.test');
  });

  it('hold crea pending con expiresAt servidor ~15 min', async () => {
    const held = await yard.hold(nora.id, {
      dogId: nala.id,
      playGroupId: med.id,
      visitDate,
      dropOffSlotId: drop.id,
      pickUpSlotId: pick.id,
    });
    expect(held.status).toBe('pending');
    const delta = new Date(held.expiresAt).getTime() - Date.now();
    expect(delta).toBeGreaterThan(14 * 60 * 1000);
    expect(delta).toBeLessThan(16 * 60 * 1000);
    expect(held.totalCents).toBe(3000);
    await yard.cancel(nora.id, held.id);
  });

  it('segundo hold same-user+perro+día → 409 ALREADY_HELD', async () => {
    const first = await yard.hold(nora.id, {
      dogId: nala.id,
      playGroupId: med.id,
      visitDate,
      dropOffSlotId: drop.id,
      pickUpSlotId: pick.id,
    });
    try {
      await yard.hold(nora.id, {
        dogId: nala.id,
        playGroupId: med.id,
        visitDate,
        dropOffSlotId: drop.id,
        pickUpSlotId: pick.id,
      });
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('ALREADY_HELD');
    }
    await yard.cancel(nora.id, first.id);
  });

  it('hold con talla distinta → 409 SIZE_MISMATCH', async () => {
    try {
      await yard.hold(nora.id, {
        dogId: nala.id,
        playGroupId: small.id,
        visitDate,
        dropOffSlotId: drop.id,
        pickUpSlotId: pick.id,
      });
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('SIZE_MISMATCH');
    }
  });

  it('hold de perro sin vacunas → 409 DOG_NOT_READY', async () => {
    try {
      await yard.hold(nora.id, {
        dogId: bruno.id,
        playGroupId: med.id,
        visitDate,
        dropOffSlotId: drop.id,
        pickUpSlotId: pick.id,
      });
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('DOG_NOT_READY');
    }
  });

  it('YARD_CLOSED → 409', async () => {
    const closed = addMadridDays(madridToday(), 3);
    await days.save({ date: closed, status: 'closed', note: 'Cerrado', capacityOverride: null } as any);
    try {
      await yard.hold(nora.id, {
        dogId: nala.id,
        playGroupId: med.id,
        visitDate: closed,
        dropOffSlotId: drop.id,
        pickUpSlotId: pick.id,
      });
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('YARD_CLOSED');
    }
  });

  it('GROUP_FULL cuando aforo N se llena', async () => {
    const day = addMadridDays(madridToday(), 4);
    await days.save({ date: day, status: 'open', note: null, capacityOverride: null } as any);
    const sDrop = await slots.findOne({ where: { playGroupId: small.id, kind: 'drop_off' } });
    const sPick = await slots.findOne({ where: { playGroupId: small.id, kind: 'pick_up' } });
    const first = await yard.hold(nora.id, {
      dogId: pipa.id,
      playGroupId: small.id,
      visitDate: day,
      dropOffSlotId: sDrop!.id,
      pickUpSlotId: sPick!.id,
    });
    const otherDog = (await dogs.save({
      userId: leo.id,
      name: 'Mila',
      size: 'S',
      vaccines: { rabiesUntil: addMadridDays(madridToday(), 400), polyvalentUntil: addMadridDays(madridToday(), 400) },
      temperament: 'social',
      photoUrl: '/assets/dog-pipa.svg',
      ready: true,
    } as any)) as Dog;
    try {
      await yard.hold(leo.id, {
        dogId: otherDog.id,
        playGroupId: small.id,
        visitDate: day,
        dropOffSlotId: sDrop!.id,
        pickUpSlotId: sPick!.id,
      });
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('GROUP_FULL');
    }
    await yard.cancel(nora.id, first.id);
  });

  it('confirm genera QR real con URL absoluta', async () => {
    const day = addMadridDays(madridToday(), 5);
    await days.save({ date: day, status: 'open', note: null, capacityOverride: null } as any);
    const held = await yard.hold(nora.id, {
      dogId: nala.id,
      playGroupId: med.id,
      visitDate: day,
      dropOffSlotId: drop.id,
      pickUpSlotId: pick.id,
    });
    const conf = await yard.confirm(nora.id, held.id);
    expect(conf.status).toBe('confirmed');
    expect(conf.qrUrl).toBe(passUrl(conf.code));
    expect(String(conf.qrSvg)).toContain(conf.qrUrl);
    expect(String(conf.qrSvg)).toContain('<svg');
    const pub = await yard.getTicket(conf.code);
    expect(pub.code).toBe(conf.code);
    expect(extractTicketCode(conf.qrUrl)).toBe(conf.code);
  });

  it('segundo hold tras confirmed → 409 ALREADY_BOOKED', async () => {
    const day = addMadridDays(madridToday(), 6);
    await days.save({ date: day, status: 'open', note: null, capacityOverride: null } as any);
    const held = await yard.hold(nora.id, {
      dogId: nala.id,
      playGroupId: med.id,
      visitDate: day,
      dropOffSlotId: drop.id,
      pickUpSlotId: pick.id,
    });
    await yard.confirm(nora.id, held.id);
    try {
      await yard.hold(nora.id, {
        dogId: nala.id,
        playGroupId: med.id,
        visitDate: day,
        dropOffSlotId: drop.id,
        pickUpSlotId: pick.id,
      });
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('ALREADY_BOOKED');
    }
  });

  it('sweeper expira pending vencidas', async () => {
    const day = addMadridDays(madridToday(), 7);
    await days.save({ date: day, status: 'open', note: null, capacityOverride: null } as any);
    const far = addMadridDays(madridToday(), 400);
    const kira = (await dogs.save({
      userId: leo.id,
      name: 'Kira',
      size: 'M',
      vaccines: { rabiesUntil: far, polyvalentUntil: far },
      temperament: 'social',
      photoUrl: '/assets/dog-nala.svg',
      ready: true,
    } as any)) as Dog;
    const held = await yard.hold(leo.id, {
      dogId: kira.id,
      playGroupId: med.id,
      visitDate: day,
      dropOffSlotId: drop.id,
      pickUpSlotId: pick.id,
    });
    const repo: Repository<Booking> = app.get(getRepositoryToken(Booking));
    const row = await repo.findOne({ where: { id: held.id } });
    row!.expiresAt = new Date(Date.now() - 1000);
    await repo.save(row as any);
    const n = await yard.expireStale();
    expect(n).toBeGreaterThanOrEqual(1);
    const after = await repo.findOne({ where: { id: held.id } });
    expect(after!.status).toBe('expired');
  });

  it('check-in y segundo scan → ALREADY_CHECKED_IN', async () => {
    const day = addMadridDays(madridToday(), 8);
    await days.save({ date: day, status: 'open', note: null, capacityOverride: null } as any);
    const held = await yard.hold(nora.id, {
      dogId: nala.id,
      playGroupId: med.id,
      visitDate: day,
      dropOffSlotId: drop.id,
      pickUpSlotId: pick.id,
    });
    const conf = await yard.confirm(nora.id, held.id);
    const in1 = await yard.checkIn(conf.code);
    expect(in1.status).toBe('checked_in');
    try {
      await yard.checkIn(conf.qrUrl);
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('ALREADY_CHECKED_IN');
    }
  });

  it('check-out con pase inválido → PICKUP_DENIED; con pase válido suma 10 pts', async () => {
    try {
      await yard.checkOut('HUE-XXXX');
      throw new Error('expected not found or 409');
    } catch (e) {
      expect(e).toBeTruthy();
    }
    const day = addMadridDays(madridToday(), 1);
    await days.save({ date: day, status: 'open', note: null, capacityOverride: null } as any);
    const held = await yard.hold(nora.id, {
      dogId: pipa.id,
      playGroupId: (await groups.findOne({ where: { slug: 'pequenos' } }))!.id,
      visitDate: day,
      dropOffSlotId: (await slots.findOne({ where: { playGroupId: small.id, kind: 'drop_off' } }))!.id,
      pickUpSlotId: (await slots.findOne({ where: { playGroupId: small.id, kind: 'pick_up' } }))!.id,
    });
    const conf = await yard.confirm(nora.id, held.id);
    try {
      await yard.checkOut(conf.code);
      throw new Error('expected 409');
    } catch (e) {
      expect(codeOf(e)).toBe('PICKUP_DENIED');
    }
    await yard.checkIn(conf.code);
    const before = (await users.findOne({ where: { id: nora.id } }))!.points;
    const out = await yard.checkOut(conf.code);
    expect(out.status).toBe('picked_up');
    const after = (await users.findOne({ where: { id: nora.id } }))!.points;
    expect(after).toBe(before + 10);
  });

  it('lista y detalle usan el mismo total de BookingLine', async () => {
    const list = await yard.listBookings(nora.id);
    expect(list.length).toBeGreaterThan(0);
    const one = list[0];
    const detail = await yard.getBooking(nora.id, one.id);
    const sum = (detail.lines || []).reduce((s: number, l: any) => s + l.subtotalCents, 0);
    expect(detail.totalCents).toBe(sum);
    expect(one.totalCents).toBe(detail.totalCents);
  });

  it('freeSlotsToday coincide entre listado y ficha', async () => {
    const list = await yard.listGroups();
    const medRow = list.find((g) => g.slug === 'medianos')!;
    const detail = await yard.getGroup(medRow.id);
    expect(detail.freeSlotsToday).toBe(medRow.freeSlotsToday);
  });

  it('stats 7 días trae series con fechas', async () => {
    const s = await yard.stats();
    expect(s.series.length).toBeGreaterThan(0);
    expect(s.series[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.series[0].capacity).toBeGreaterThan(0);
  });

  it('hold con add-on suma líneas', async () => {
    const day = addMadridDays(madridToday(), 9);
    await days.save({ date: day, status: 'open', note: null, capacityOverride: null } as any);
    const bath = await addons.findOne({ where: { slug: 'bath' } });
    const held = await yard.hold(nora.id, {
      dogId: nala.id,
      playGroupId: med.id,
      visitDate: day,
      dropOffSlotId: drop.id,
      pickUpSlotId: pick.id,
      addonIds: [bath!.id],
    });
    expect(held.totalCents).toBe(3000 + 1200);
    expect(held.lines.length).toBe(2);
    await yard.cancel(nora.id, held.id);
  });

  it('reseña solo tras picked_up', async () => {
    const picked = (await yard.listBookings(nora.id)).find((b) => b.status === 'picked_up');
    expect(picked).toBeTruthy();
    const r = await yard.createReview(nora.id, { bookingId: picked!.id, rating: 5, comment: 'Patio limpio' });
    expect(r.rating).toBe(5);
  });

  it('pack lista checked_in de hoy', async () => {
    const pack = await yard.pack();
    expect(Array.isArray(pack)).toBe(true);
  });

  it('pase público acepta URL o código', async () => {
    const list = await yard.listBookings(nora.id);
    const withQr = list.find((b) => b.qrUrl);
    if (withQr) {
      const a = await yard.getTicket(withQr.code);
      const b = await yard.getTicket(withQr.qrUrl);
      expect(a.id).toBe(b.id);
    }
  });
});
