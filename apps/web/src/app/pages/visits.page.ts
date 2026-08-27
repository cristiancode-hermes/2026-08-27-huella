import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Booking, euros } from '../shared/models';

@Component({
  selector: 'app-visits',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Mis visitas</h1>
      @if (error()) {
        <section class="state-screen">
          <h2>No pudimos cargar las visitas</h2>
          <p class="lede">{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!rows().length) {
        <section class="state-screen">
          <h2>Aún no hay visitas</h2>
          <p class="lede">Reserva un día de patio para ver el historial aquí.</p>
          <a class="btn btn-primary" routerLink="/checkout">Reservar</a>
        </section>
      } @else {
        <div class="list">
          @for (b of rows(); track b.id) {
            <a class="card" [routerLink]="['/mis-visitas', b.id]">
              <div class="card-body">
                <h3>{{ b.dog?.name }} · {{ b.visitDate }}</h3>
                <p class="muted">{{ b.playGroup?.name }} · {{ b.status }} · {{ euros(b.totalCents) }}</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class VisitsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly rows = signal<Booking[]>([]);
  readonly error = signal('');
  euros = euros;

  ngOnInit() {
    this.load();
  }

  load() {
    this.error.set('');
    this.api.bookings().subscribe({
      next: (rows) => this.rows.set(rows),
      error: () => this.error.set('Inténtalo de nuevo en un momento.'),
    });
  }
}
