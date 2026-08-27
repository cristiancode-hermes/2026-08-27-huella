import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Addon, Dog, PlayGroup, Slot, euros, humanConflict } from '../shared/models';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="wrap checkout">
      <div>
        <h1>Reservar el día</h1>
        <p class="lede">Elige perro, manada, entrada y recogida. El total se calcula antes de retener.</p>

        <label for="dog">Perro</label>
        <select id="dog" [ngModel]="dogId()" (ngModelChange)="dogId.set($event)">
          <option value="">Selecciona</option>
          @for (d of dogs(); track d.id) {
            <option [value]="d.id">{{ d.name }} · {{ d.size }} {{ d.ready ? '' : '(vacunas)' }}</option>
          }
        </select>
        @if (!dogs().length) {
          <p><a routerLink="/perros/nuevo">Ficha un perro primero</a></p>
        }

        <label for="group">Manada</label>
        <select id="group" [ngModel]="groupId()" (ngModelChange)="onGroup($event)">
          <option value="">Selecciona</option>
          @for (g of groups(); track g.id) {
            <option [value]="g.id">{{ g.name }} · {{ g.freeSlotsToday }} huecos hoy</option>
          }
        </select>

        <label for="date">Fecha</label>
        <input id="date" type="date" [ngModel]="visitDate()" (ngModelChange)="onDate($event)" />

        <h3>Entrada</h3>
        <div class="rail">
          @for (s of dropOff(); track s.id) {
            <button type="button" class="slot-chip" [class.selected]="dropId() === s.id" (click)="dropId.set(s.id)">
              <span class="slot-time">{{ s.startTime }}</span>
              <span class="slot-state">Libre</span>
            </button>
          }
        </div>
        <h3>Recogida</h3>
        <div class="rail">
          @for (s of pickUp(); track s.id) {
            <button type="button" class="slot-chip" [class.selected]="pickId() === s.id" (click)="pickId.set(s.id)">
              <span class="slot-time">{{ s.startTime }}</span>
              <span class="slot-state">Libre</span>
            </button>
          }
        </div>

        <h3>Extras</h3>
        <div class="picker">
          @for (a of addons(); track a.id) {
            <label>
              <input type="checkbox" [checked]="addonIds().includes(a.id)" (change)="toggleAddon(a.id)" />
              <span>{{ a.name }} · {{ euros(a.priceCents) }}</span>
            </label>
          }
        </div>
      </div>

      <aside class="summary" id="hold-action">
        <h3>Resumen</h3>
        <ul>
          @for (line of previewLines(); track line.label) {
            <li><span>{{ line.label }}</span><span>{{ euros(line.cents) }}</span></li>
          }
        </ul>
        <p><strong>Total {{ euros(previewTotal()) }}</strong></p>
        @if (holdError()) {
          <p class="hold-error form-error" role="alert">{{ holdError() }}</p>
        }
        <button class="btn btn-primary" type="button" (click)="hold()" [disabled]="busy()">
          {{ busy() ? 'Reteniendo…' : 'Retener 15 min' }}
        </button>
        @if (heldId()) {
          <p class="muted">Retención hasta {{ timer() }}</p>
          <button class="btn btn-accent" type="button" (click)="pay()">Confirmar y pagar</button>
        }
      </aside>
    </div>
  `,
})
export class CheckoutPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly dogs = signal<Dog[]>([]);
  readonly groups = signal<PlayGroup[]>([]);
  readonly addons = signal<Addon[]>([]);
  readonly dropOff = signal<Slot[]>([]);
  readonly pickUp = signal<Slot[]>([]);
  readonly dogId = signal('');
  readonly groupId = signal('');
  readonly visitDate = signal(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date()),
  );
  readonly dropId = signal('');
  readonly pickId = signal('');
  readonly addonIds = signal<string[]>([]);
  readonly holdError = signal('');
  readonly busy = signal(false);
  readonly heldId = signal('');
  readonly expiresAt = signal<number | null>(null);
  readonly timer = signal('');
  private tick: ReturnType<typeof setInterval> | null = null;

  readonly selectedGroup = computed(() => this.groups().find((g) => g.id === this.groupId()) || null);
  readonly previewLines = computed(() => {
    const lines: { label: string; cents: number }[] = [];
    const g = this.selectedGroup();
    if (g) lines.push({ label: `Día en ${g.name}`, cents: g.priceCents });
    for (const a of this.addons()) {
      if (this.addonIds().includes(a.id)) lines.push({ label: a.name, cents: a.priceCents });
    }
    return lines;
  });
  readonly previewTotal = computed(() => this.previewLines().reduce((s, l) => s + l.cents, 0));
  euros = euros;

  ngOnInit() {
    const qGroup = this.route.snapshot.queryParamMap.get('group') || '';
    this.api.dogs().subscribe((d) => this.dogs.set(d));
    this.api.groups().subscribe((g) => {
      this.groups.set(g);
      if (qGroup) {
        this.groupId.set(qGroup);
        this.loadSlots();
      }
    });
    this.api.addons().subscribe((a) => this.addons.set(a));
    document.addEventListener('visibilitychange', this.resync);
  }

  ngOnDestroy() {
    if (this.tick) clearInterval(this.tick);
    document.removeEventListener('visibilitychange', this.resync);
  }

  onGroup(id: string) {
    this.groupId.set(id);
    this.loadSlots();
  }

  onDate(d: string) {
    this.visitDate.set(d);
    this.loadSlots();
  }

  loadSlots() {
    if (!this.groupId() || !this.visitDate()) return;
    this.api.slots(this.groupId(), this.visitDate()).subscribe({
      next: (s) => {
        this.dropOff.set(s.dropOff);
        this.pickUp.set(s.pickUp);
      },
    });
  }

  toggleAddon(id: string) {
    const cur = this.addonIds();
    this.addonIds.set(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  hold() {
    this.holdError.set('');
    if (!this.dogId() || !this.groupId() || !this.dropId() || !this.pickId()) {
      this.holdError.set('Elige perro, manada, entrada y recogida.');
      this.scrollCta();
      return;
    }
    this.busy.set(true);
    this.api
      .hold({
        dogId: this.dogId(),
        playGroupId: this.groupId(),
        visitDate: this.visitDate(),
        dropOffSlotId: this.dropId(),
        pickUpSlotId: this.pickId(),
        addonIds: this.addonIds(),
      })
      .subscribe({
        next: (b) => {
          this.busy.set(false);
          this.heldId.set(b.id);
          this.expiresAt.set(b.expiresAt ? new Date(b.expiresAt).getTime() : null);
          this.startTimer();
        },
        error: (err) => {
          this.busy.set(false);
          this.holdError.set(humanConflict(err));
          this.scrollCta();
        },
      });
  }

  pay() {
    const id = this.heldId();
    if (!id) return;
    this.busy.set(true);
    this.api.confirm(id).subscribe({
      next: (b) => {
        this.busy.set(false);
        void this.router.navigate(['/confirmacion', b.code]);
      },
      error: (err) => {
        this.busy.set(false);
        this.holdError.set(humanConflict(err));
        this.scrollCta();
      },
    });
  }

  private scrollCta() {
    document.getElementById('hold-action')?.scrollIntoView({ block: 'center' });
  }

  private resync = () => this.renderTimer();

  private startTimer() {
    if (this.tick) clearInterval(this.tick);
    this.renderTimer();
    this.tick = setInterval(() => this.renderTimer(), 1000);
  }

  private renderTimer() {
    const exp = this.expiresAt();
    if (!exp) return;
    const left = Math.max(0, exp - Date.now());
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    this.timer.set(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
  }
}
