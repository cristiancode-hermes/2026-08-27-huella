import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Addon,
  Booking,
  BookingLine,
  Dog,
  EmailLog,
  PlayGroup,
  Review,
  Slot,
  User,
  YardDay,
} from '../entities/entities';
import { addMadridDays, hoursUntilDateStart, madridToday, vaccinesReady } from '../common/time';
import { buildPassQrSvg, extractTicketCode, makeCode, passUrl } from '../common/qr';
import { withLock } from '../common/mutex';

const LIVE = ['pending', 'confirmed', 'checked_in'] as const;
const HOLD_MS = 15 * 60 * 1000;
const POINTS_PER_VISIT = 10;

const HUMAN: Record<string, string> = {
  GROUP_FULL: 'Esta manada está completa ese día. Elige otra fecha o grupo.',
  YARD_CLOSED: 'El patio no abre ese día.',
  ALREADY_HELD: 'Ya tienes una retención viva para este perro.',
  ALREADY_BOOKED: 'Este perro ya tiene visita ese día.',
  DOG_NOT_READY: 'Faltan vacunas en vigor. Actualiza la ficha.',
  SIZE_MISMATCH: 'La talla del perro no encaja en esta manada.',
  SLOT_TAKEN: 'Esa ventana ya no está disponible.',
  HOLD_EXPIRED: 'La retención caducó. Empieza de nuevo.',
  ALREADY_CHECKED_IN: 'Esta visita ya está en el patio.',
  PICKUP_DENIED: 'Este pase no autoriza la recogida.',
  CANCEL_WINDOW: 'Faltan menos de 24 h. No se puede cancelar.',
  NOT_CONFIRMABLE: 'Esta visita no se puede confirmar.',
  DOG_ACTIVE: 'Este perro tiene una visita activa.',
};

function conflict(code: string, message?: string): never {
  throw new ConflictException({ code, message: message || HUMAN[code] || code });
}

function isLivePending(b: Booking, now = Date.now()): boolean {
  if (b.status !== 'pending') return (LIVE as readonly string[]).includes(b.status);
  if (!b.expiresAt) return true;
  return b.expiresAt.getTime() > now;
}

@Injectable()
export class YardService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Dog) private readonly dogs: Repository<Dog>,
    @InjectRepository(PlayGroup) private readonly groups: Repository<PlayGroup>,
    @InjectRepository(Slot) private readonly slots: Repository<Slot>,
    @InjectRepository(YardDay) private readonly days: Repository<YardDay>,
    @InjectRepository(Addon) private readonly addons: Repository<Addon>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(EmailLog) private readonly emails: Repository<EmailLog>,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.expireStale().catch(() => undefined);
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async expireStale(): Promise<number> {
    const now = new Date();
    const pending = await this.bookings.find({ where: { status: 'pending' } });
    let n = 0;
    for (const b of pending) {
      if (b.expiresAt && b.expiresAt.getTime() <= now.getTime()) {
        b.status = 'expired';
        await this.bookings.save(b as any);
        n += 1;
      }
    }
    return n;
  }

  private occupancy(group: PlayGroup, day: YardDay | null): number {
    if (day?.status === 'limited' && day.capacityOverride != null) return day.capacityOverride;
    return group.capacity;
  }

  async liveForGroupDate(playGroupId: string, visitDate: string, excludeId?: string): Promise<Booking[]> {
    const rows = await this.bookings.find({
      where: { playGroupId, visitDate, status: In([...LIVE]) },
    });
    return rows.filter((b) => {
      if (excludeId && b.id === excludeId) return false;
      return isLivePending(b);
    });
  }

  async freeSlotsToday(playGroupId: string, date = madridToday()): Promise<number> {
    const group = await this.groups.findOne({ where: { id: playGroupId } });
    if (!group) return 0;
    const day = await this.ensureYardDay(date);
    if (day.status === 'closed') return 0;
    const cap = this.occupancy(group, day);
    const live = await this.liveForGroupDate(playGroupId, date);
    return Math.max(0, cap - live.length);
  }

  async ensureYardDay(date: string): Promise<YardDay> {
    let day = await this.days.findOne({ where: { date } });
    if (day) return day;
    const [y, m, d] = date.split('-').map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d));
    const sunday = utc.getUTCDay() === 0;
    day = (await this.days.save({
      date,
      status: sunday ? 'closed' : 'open',
      note: sunday ? 'Domingo de descanso' : null,
      capacityOverride: null,
    } as any)) as YardDay;
    return day;
  }

  async seedCalendarIfNeeded() {
    const today = madridToday();
    for (let i = 0; i < 14; i++) {
      await this.ensureYardDay(addMadridDays(today, i));
    }
  }

  async listGroups() {
    const all = await this.groups.find({ order: { sortOrder: 'ASC' } });
    const date = madridToday();
    const out = [];
    for (const g of all) {
      const free = await this.freeSlotsToday(g.id, date);
      out.push({
        ...g,
        freeSlotsToday: free,
        occupancyLabel: free > 0 ? 'Libre' : 'Completa',
      });
    }
    return out;
  }

  async getGroup(id: string) {
    const g = await this.groups.findOne({ where: { id } });
    if (!g) throw new NotFoundException('Manada no encontrada');
    const date = madridToday();
    const free = await this.freeSlotsToday(g.id, date);
    const reviews = await this.reviews.find({
      where: { playGroupId: g.id },
      order: { createdAt: 'DESC' },
      take: 12,
    });
    return {
      ...g,
      freeSlotsToday: free,
      occupancyLabel: free > 0 ? 'Libre' : 'Completa',
      reviews,
    };
  }

  async groupSlots(id: string, date?: string) {
    const g = await this.groups.findOne({ where: { id } });
    if (!g) throw new NotFoundException('Manada no encontrada');
    const visitDate = date || madridToday();
    const slots = await this.slots.find({ where: { playGroupId: id }, order: { startTime: 'ASC' } });
    const dropOff = slots.filter((s) => s.kind === 'drop_off');
    const pickUp = slots.filter((s) => s.kind === 'pick_up');
    const day = await this.ensureYardDay(visitDate);
    const free = await this.freeSlotsToday(id, visitDate);
    return {
      date: visitDate,
      yard: day,
      freeSlotsToday: free,
      dropOff,
      pickUp,
    };
  }

  listAddons() {
    return this.addons.find({ where: { active: true }, order: { priceCents: 'ASC' } });
  }

  async getYardDay(date: string) {
    return this.ensureYardDay(date);
  }

  async patchYardDay(date: string, dto: { status: 'open' | 'limited' | 'closed'; note?: string; capacityOverride?: number }) {
    const day = await this.ensureYardDay(date);
    day.status = dto.status;
    if (dto.note !== undefined) day.note = dto.note;
    if (dto.capacityOverride !== undefined) day.capacityOverride = dto.capacityOverride;
    return this.days.save(day as any);
  }

  private refreshReady(dog: Dog) {
    dog.ready = vaccinesReady(dog.vaccines);
    return dog;
  }

  async listDogs(userId: string) {
    const rows = await this.dogs.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return rows.map((d) => this.refreshReady(d));
  }

  async getDog(userId: string, id: string) {
    const dog = await this.dogs.findOne({ where: { id } });
    if (!dog) throw new NotFoundException('Perro no encontrado');
    if (dog.userId !== userId) throw new ForbiddenException();
    return this.refreshReady(dog);
  }

  async createDog(
    userId: string,
    dto: {
      name: string;
      size: 'S' | 'M' | 'L';
      vaccines: { rabiesUntil: string; polyvalentUntil: string };
      temperament?: 'social' | 'shy' | 'playful';
      photoUrl?: string;
    },
  ) {
    const dog = this.dogs.create({
      userId,
      name: dto.name.trim(),
      size: dto.size,
      vaccines: dto.vaccines,
      temperament: dto.temperament || 'social',
      photoUrl: dto.photoUrl || null,
      ready: vaccinesReady(dto.vaccines),
    });
    return this.dogs.save(dog as any);
  }

  async patchDog(userId: string, id: string, dto: Partial<Dog>) {
    const dog = await this.getDog(userId, id);
    if (dto.name) dog.name = dto.name;
    if (dto.size) dog.size = dto.size;
    if (dto.vaccines) dog.vaccines = dto.vaccines;
    if (dto.temperament) dog.temperament = dto.temperament;
    if (dto.photoUrl !== undefined) dog.photoUrl = dto.photoUrl;
    this.refreshReady(dog);
    return this.dogs.save(dog as any);
  }

  async deleteDog(userId: string, id: string) {
    const dog = await this.getDog(userId, id);
    const live = await this.bookings.find({
      where: { dogId: dog.id, status: In([...LIVE]) },
    });
    if (live.some((b) => isLivePending(b))) conflict('DOG_ACTIVE');
    await this.dogs.delete(dog.id);
    return { ok: true };
  }

  hold(
    userId: string,
    dto: {
      dogId: string;
      playGroupId: string;
      visitDate: string;
      dropOffSlotId: string;
      pickUpSlotId: string;
      addonIds?: string[];
    },
  ) {
    return withLock(() => this.holdLocked(userId, dto));
  }

  private async holdLocked(
    userId: string,
    dto: {
      dogId: string;
      playGroupId: string;
      visitDate: string;
      dropOffSlotId: string;
      pickUpSlotId: string;
      addonIds?: string[];
    },
  ) {
    await this.expireStale();
    const dog = await this.dogs.findOne({ where: { id: dto.dogId } });
    if (!dog || dog.userId !== userId) throw new NotFoundException('Perro no encontrado');
    this.refreshReady(dog);
    if (!dog.ready) conflict('DOG_NOT_READY');

    const group = await this.groups.findOne({ where: { id: dto.playGroupId } });
    if (!group) throw new NotFoundException('Manada no encontrada');
    if (dog.size !== group.size) {
      conflict('SIZE_MISMATCH');
    }

    const visitDate = dto.visitDate;
    const day = await this.ensureYardDay(visitDate);
    if (day.status === 'closed') conflict('YARD_CLOSED');

    const drop = await this.slots.findOne({ where: { id: dto.dropOffSlotId } });
    const pick = await this.slots.findOne({ where: { id: dto.pickUpSlotId } });
    if (!drop || !pick || drop.playGroupId !== group.id || pick.playGroupId !== group.id) {
      throw new BadRequestException('Ventanas no válidas');
    }
    if (drop.kind !== 'drop_off' || pick.kind !== 'pick_up') {
      throw new BadRequestException('Elige entrada y recogida');
    }
    if (pick.startTime <= drop.startTime) {
      throw new BadRequestException('La recogida debe ser después de la entrada');
    }

    const sameDog = await this.bookings.find({
      where: { dogId: dog.id, visitDate, status: In([...LIVE]) },
    });
    const liveSame = sameDog.filter((b) => isLivePending(b));
    if (liveSame.some((b) => b.status === 'pending' && b.userId === userId)) conflict('ALREADY_HELD');
    if (liveSame.length) conflict('ALREADY_BOOKED');

    const liveGroup = await this.liveForGroupDate(group.id, visitDate);
    const cap = this.occupancy(group, day);
    if (liveGroup.length >= cap) conflict('GROUP_FULL');

    const addonIds = dto.addonIds || [];
    const addonRows = addonIds.length
      ? await this.addons.find({ where: { id: In(addonIds), active: true } })
      : [];

    const lines: Partial<BookingLine>[] = [
      {
        kind: 'day',
        addonId: null,
        label: `Día en ${group.name}`,
        qty: 1,
        unitCents: group.priceCents,
        subtotalCents: group.priceCents,
      },
    ];
    for (const a of addonRows) {
      lines.push({
        kind: 'addon',
        addonId: a.id,
        label: a.name,
        qty: 1,
        unitCents: a.priceCents,
        subtotalCents: a.priceCents,
      });
    }
    const totalCents = lines.reduce((s, l) => s + (l.subtotalCents || 0), 0);

    const booking = (await this.bookings.save({
      userId,
      dogId: dog.id,
      playGroupId: group.id,
      visitDate,
      dropOffSlotId: drop.id,
      pickUpSlotId: pick.id,
      status: 'pending',
      expiresAt: new Date(Date.now() + HOLD_MS),
      code: makeCode(),
      qrSvg: null,
      qrUrl: null,
      totalCents,
    } as any)) as Booking;

    for (const l of lines) {
      await this.lines.save({ ...l, bookingId: booking.id } as any);
    }
    return this.decorateBooking(booking.id);
  }

  async confirm(userId: string, id: string) {
    return withLock(() => this.confirmLocked(userId, id));
  }

  private async confirmLocked(userId: string, id: string) {
    await this.expireStale();
    const b = await this.bookings.findOne({ where: { id } });
    if (!b || b.userId !== userId) throw new NotFoundException('Visita no encontrada');
    if (b.status !== 'pending') conflict('NOT_CONFIRMABLE');
    if (b.expiresAt && b.expiresAt.getTime() <= Date.now()) {
      b.status = 'expired';
      await this.bookings.save(b as any);
      conflict('HOLD_EXPIRED');
    }
    b.status = 'confirmed';
    b.expiresAt = null;
    b.qrUrl = passUrl(b.code);
    b.qrSvg = await buildPassQrSvg(b.qrUrl, b.code);
    await this.bookings.save(b as any);
    const user = await this.users.findOne({ where: { id: userId } });
    await this.emails.save({
      bookingId: b.id,
      toEmail: user?.email || '',
      subject: `Pase de recogida ${b.code}`,
      body: `Tu pase: ${b.qrUrl}`,
    } as any);
    return this.decorateBooking(b.id);
  }

  async cancel(userId: string, id: string) {
    const b = await this.bookings.findOne({ where: { id } });
    if (!b || b.userId !== userId) throw new NotFoundException('Visita no encontrada');
    if (b.status === 'checked_in' || b.status === 'picked_up') conflict('NOT_CONFIRMABLE');
    if (b.status === 'confirmed') {
      const hours = hoursUntilDateStart(b.visitDate);
      if (hours < 24) conflict('CANCEL_WINDOW');
    }
    b.status = 'cancelled';
    await this.bookings.save(b as any);
    return this.decorateBooking(b.id);
  }

  async listBookings(userId: string) {
    const rows = await this.bookings.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['dog', 'playGroup', 'lines', 'dropOffSlot', 'pickUpSlot'],
    });
    return Promise.all(rows.map((b) => this.withDerivedTotal(b)));
  }

  async getBooking(userId: string, id: string) {
    const b = await this.bookings.findOne({
      where: { id },
      relations: ['dog', 'playGroup', 'lines', 'dropOffSlot', 'pickUpSlot'],
    });
    if (!b || b.userId !== userId) throw new NotFoundException('Visita no encontrada');
    return this.withDerivedTotal(b);
  }

  async getTicket(codeOrUrl: string) {
    const code = extractTicketCode(codeOrUrl);
    const b = await this.bookings.findOne({
      where: { code },
      relations: ['dog', 'playGroup', 'dropOffSlot', 'pickUpSlot', 'lines'],
    });
    if (!b) throw new NotFoundException('Pase no encontrado');
    if (!b.qrUrl || !b.qrSvg || !String(b.qrSvg).includes(passUrl(b.code))) {
      b.qrUrl = passUrl(b.code);
      b.qrSvg = await buildPassQrSvg(b.qrUrl, b.code);
      await this.bookings.save(b as any);
    }
    return this.withDerivedTotal(b);
  }

  async checkIn(codeOrUrl: string) {
    return withLock(async () => {
      const b = await this.findByCode(codeOrUrl);
      if (b.status === 'checked_in' || b.status === 'picked_up') conflict('ALREADY_CHECKED_IN');
      if (b.status !== 'confirmed') conflict('NOT_CONFIRMABLE');
      b.status = 'checked_in';
      b.checkedInAt = new Date();
      await this.bookings.save(b as any);
      return this.decorateBooking(b.id);
    });
  }

  async checkOut(codeOrUrl: string) {
    return withLock(async () => {
      const b = await this.findByCode(codeOrUrl);
      if (b.status !== 'checked_in') conflict('PICKUP_DENIED');
      b.status = 'picked_up';
      b.pickedUpAt = new Date();
      await this.bookings.save(b as any);
      const owner = await this.users.findOne({ where: { id: b.userId } });
      if (owner) {
        owner.points = (owner.points || 0) + POINTS_PER_VISIT;
        await this.users.save(owner as any);
      }
      return this.decorateBooking(b.id);
    });
  }

  async pack() {
    const today = madridToday();
    const rows = await this.bookings.find({
      where: { status: 'checked_in', visitDate: today },
      relations: ['dog', 'playGroup', 'dropOffSlot', 'pickUpSlot'],
      order: { checkedInAt: 'ASC' },
    });
    return rows;
  }

  async stats(from?: string, to?: string) {
    const start = from || addMadridDays(madridToday(), -6);
    const end = to || madridToday();
    const groups = await this.groups.find({ order: { sortOrder: 'ASC' } });
    const series: { date: string; groupId: string; groupName: string; occupied: number; capacity: number }[] = [];
    let cursor = start;
    while (cursor <= end) {
      for (const g of groups) {
        const live = await this.liveForGroupDate(g.id, cursor);
        const picked = await this.bookings.count({
          where: { playGroupId: g.id, visitDate: cursor, status: In(['checked_in', 'picked_up', 'confirmed']) },
        });
        series.push({
          date: cursor,
          groupId: g.id,
          groupName: g.name,
          occupied: Math.max(live.length, picked),
          capacity: g.capacity,
        });
      }
      cursor = addMadridDays(cursor, 1);
    }
    return { from: start, to: end, series };
  }

  async createReview(userId: string, dto: { bookingId: string; rating: number; comment?: string }) {
    const b = await this.bookings.findOne({ where: { id: dto.bookingId } });
    if (!b || b.userId !== userId) throw new NotFoundException('Visita no encontrada');
    if (b.status !== 'picked_up') conflict('NOT_CONFIRMABLE', 'Solo puedes valorar después de recoger.');
    const existing = await this.reviews.findOne({ where: { bookingId: b.id } });
    if (existing) conflict('ALREADY_BOOKED', 'Ya valoraste esta visita.');
    const rating = Math.min(5, Math.max(1, Number(dto.rating) || 0));
    return this.reviews.save({
      bookingId: b.id,
      userId,
      playGroupId: b.playGroupId,
      rating,
      comment: dto.comment || null,
    } as any);
  }

  async groupReviews(id: string) {
    return this.reviews.find({ where: { playGroupId: id }, order: { createdAt: 'DESC' } });
  }

  private async findByCode(codeOrUrl: string) {
    const code = extractTicketCode(codeOrUrl);
    const b = await this.bookings.findOne({ where: { code } });
    if (!b) throw new NotFoundException('Pase no encontrado');
    return b;
  }

  private async decorateBooking(id: string) {
    const b = await this.bookings.findOne({
      where: { id },
      relations: ['dog', 'playGroup', 'lines', 'dropOffSlot', 'pickUpSlot'],
    });
    if (!b) throw new NotFoundException('Visita no encontrada');
    return this.withDerivedTotal(b);
  }

  private async withDerivedTotal(b: Booking) {
    const lines = b.lines?.length
      ? b.lines
      : await this.lines.find({ where: { bookingId: b.id } });
    const totalCents = lines.reduce((s, l) => s + (l.subtotalCents || 0), 0);
    if (b.totalCents !== totalCents) {
      b.totalCents = totalCents;
      await this.bookings.save(b as any);
    }
    return { ...b, lines, totalCents };
  }
}
