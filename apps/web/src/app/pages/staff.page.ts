import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Booking, OccupancyPoint, humanConflict } from '../shared/models';

@Component({
  selector: 'app-staff',
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <h1>Patio vivo</h1>
      <p class="lede">Escanea el pase en el umbral. Recoger solo con QR.</p>
      <form (ngSubmit)="scanIn()" class="form-stack">
        <label for="codeIn">Check-in (código o URL)</label>
        <input id="codeIn" autocomplete="off" [ngModel]="codeIn()" (ngModelChange)="codeIn.set($event)" name="codeIn" />
        <button class="btn btn-primary" type="submit" id="hold-action">Entrada al patio</button>
      </form>
      @if (msg()) {
        <p class="hold-error form-error" role="alert">{{ msg() }}</p>
      }
      <form (ngSubmit)="scanOut()" class="form-stack">
        <label for="codeOut">Check-out / recogida</label>
        <input id="codeOut" autocomplete="off" [ngModel]="codeOut()" (ngModelChange)="codeOut.set($event)" name="codeOut" />
        <button class="btn btn-secondary" type="submit">Liberar perro</button>
      </form>

      <h2>Manada ahora</h2>
      @if (!pack().length) {
        <section class="state-screen">
          <h3>Patio vacío</h3>
          <p class="lede">Cuando un tutor deje al perro, aparecerá aquí.</p>
        </section>
      } @else {
        <div class="rail">
          @for (b of pack(); track b.id) {
            <div class="rail-item">
              <p class="now">En patio</p>
              <strong>{{ b.dog?.name }}</strong>
              <p class="muted">{{ b.playGroup?.name }} · {{ b.code }}</p>
            </div>
          }
        </div>
      }

      <h2>Ocupación 7 días</h2>
      <svg class="chart" viewBox="0 0 640 220" role="img" aria-label="Ocupación por día">
        <line x1="40" y1="180" x2="620" y2="180" stroke="currentColor" />
        <line x1="40" y1="20" x2="40" y2="180" stroke="currentColor" />
        @for (p of chart(); track p.date; let i = $index) {
          <rect [attr.x]="50 + i * 80" [attr.y]="180 - p.h" width="36" [attr.height]="p.h"
            fill="#215C38" [attr.title]="p.label">
            <title>{{ p.label }}</title>
          </rect>
          <text [attr.x]="50 + i * 80" y="200" font-size="11">{{ p.date.slice(5) }}</text>
        }
        <text x="8" y="24" font-size="11">aforo</text>
      </svg>
    </div>
  `,
})
export class StaffPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly pack = signal<Booking[]>([]);
  readonly series = signal<OccupancyPoint[]>([]);
  readonly codeIn = signal('');
  readonly codeOut = signal('');
  readonly msg = signal('');
  readonly chart = signal<{ date: string; h: number; label: string }[]>([]);

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.api.pack().subscribe({ next: (p) => this.pack.set(p) });
    this.api.stats().subscribe({
      next: (s) => {
        this.series.set(s.series);
        const byDate = new Map<string, { occ: number; cap: number }>();
        for (const row of s.series) {
          const cur = byDate.get(row.date) || { occ: 0, cap: 0 };
          cur.occ += row.occupied;
          cur.cap += row.capacity;
          byDate.set(row.date, cur);
        }
        const points = [...byDate.entries()].slice(0, 7).map(([date, v]) => ({
          date,
          h: v.cap ? Math.round((v.occ / v.cap) * 150) : 0,
          label: `${date}: ${v.occ}/${v.cap}`,
        }));
        this.chart.set(points);
      },
    });
  }

  scanIn() {
    this.msg.set('');
    this.api.checkIn(this.codeIn()).subscribe({
      next: () => {
        this.codeIn.set('');
        this.refresh();
      },
      error: (err) => this.msg.set(humanConflict(err)),
    });
  }

  scanOut() {
    this.msg.set('');
    this.api.checkOut(this.codeOut()).subscribe({
      next: () => {
        this.codeOut.set('');
        this.refresh();
      },
      error: (err) => this.msg.set(humanConflict(err)),
    });
  }
}
