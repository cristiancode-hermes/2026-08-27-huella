import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 180, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 120 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: 'tutor' })
  role: 'tutor' | 'staff' | 'admin';

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Dog, (d: Dog) => d.user)
  dogs?: Dog[];

  @OneToMany(() => Booking, (b: Booking) => b.user)
  bookings?: Booking[];
}

@Entity({ name: 'dogs' })
export class Dog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (u: User) => u.dogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ type: 'varchar', length: 4 })
  size: 'S' | 'M' | 'L';

  @Column({ type: 'simple-json' })
  vaccines: { rabiesUntil: string; polyvalentUntil: string };

  @Column({ type: 'varchar', length: 16, default: 'social' })
  temperament: 'social' | 'shy' | 'playful';

  @Column({ type: 'varchar', length: 240, nullable: true })
  photoUrl: string | null;

  @Column({ type: 'boolean', default: false })
  ready: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Booking, (b: Booking) => b.dog)
  bookings?: Booking[];
}

@Entity({ name: 'play_groups' })
export class PlayGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 4 })
  size: 'S' | 'M' | 'L';

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 240 })
  photoUrl: string;

  @Column({ type: 'int' })
  sortOrder: number;

  @OneToMany(() => Slot, (s: Slot) => s.playGroup)
  slots?: Slot[];

  @OneToMany(() => Booking, (b: Booking) => b.playGroup)
  bookings?: Booking[];
}

@Entity({ name: 'slots' })
export class Slot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  playGroupId: string;

  @ManyToOne(() => PlayGroup, (g: PlayGroup) => g.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playGroupId' })
  playGroup?: PlayGroup;

  @Column({ type: 'varchar', length: 16 })
  kind: 'drop_off' | 'pick_up';

  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  @Column({ type: 'varchar', length: 40 })
  label: string;
}

@Entity({ name: 'yard_days' })
export class YardDay {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  date: string;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: 'open' | 'limited' | 'closed';

  @Column({ type: 'varchar', length: 180, nullable: true })
  note: string | null;

  @Column({ type: 'int', nullable: true })
  capacityOverride: number | null;
}

@Entity({ name: 'addons' })
export class Addon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

@Entity({ name: 'bookings' })
@Index('booking_dog_day', ['dogId', 'visitDate'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User, (u: User) => u.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar' })
  dogId: string;

  @ManyToOne(() => Dog, (d: Dog) => d.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dogId' })
  dog?: Dog;

  @Column({ type: 'varchar' })
  playGroupId: string;

  @ManyToOne(() => PlayGroup, (g: PlayGroup) => g.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playGroupId' })
  playGroup?: PlayGroup;

  @Column({ type: 'varchar', length: 10 })
  visitDate: string;

  @Column({ type: 'varchar' })
  dropOffSlotId: string;

  @ManyToOne(() => Slot)
  @JoinColumn({ name: 'dropOffSlotId' })
  dropOffSlot?: Slot;

  @Column({ type: 'varchar' })
  pickUpSlotId: string;

  @ManyToOne(() => Slot)
  @JoinColumn({ name: 'pickUpSlotId' })
  pickUpSlot?: Slot;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'confirmed' | 'checked_in' | 'picked_up' | 'cancelled' | 'expired';

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'varchar', length: 12, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  qrSvg: string | null;

  @Column({ type: 'text', nullable: true })
  qrUrl: string | null;

  @Column({ type: 'int', default: 0 })
  totalCents: number;

  @Column({ type: 'datetime', nullable: true })
  checkedInAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  pickedUpAt: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => BookingLine, (l: BookingLine) => l.booking)
  lines?: BookingLine[];
}

@Entity({ name: 'booking_lines' })
export class BookingLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  bookingId: string;

  @ManyToOne(() => Booking, (b: Booking) => b.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'varchar', length: 16 })
  kind: 'day' | 'addon';

  @Column({ type: 'varchar', nullable: true })
  addonId: string | null;

  @ManyToOne(() => Addon, { nullable: true })
  @JoinColumn({ name: 'addonId' })
  addon?: Addon | null;

  @Column({ type: 'varchar', length: 80 })
  label: string;

  @Column({ type: 'int', default: 1 })
  qty: number;

  @Column({ type: 'int' })
  unitCents: number;

  @Column({ type: 'int' })
  subtotalCents: number;
}

@Entity({ name: 'reviews' })
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  bookingId: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar' })
  playGroupId: string;

  @ManyToOne(() => PlayGroup)
  @JoinColumn({ name: 'playGroupId' })
  playGroup?: PlayGroup;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity({ name: 'email_logs' })
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  bookingId: string;

  @Column({ type: 'varchar' })
  toEmail: string;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

export const ALL_ENTITIES = [
  User,
  Dog,
  PlayGroup,
  Slot,
  YardDay,
  Addon,
  Booking,
  BookingLine,
  Review,
  EmailLog,
];
