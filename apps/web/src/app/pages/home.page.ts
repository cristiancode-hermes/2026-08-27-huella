import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { PlayGroup, euros } from '../shared/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <section class="hero">
        <div>
          <h1>Deja al perro en manada. Recógelo con el pase.</h1>
          <p class="lede">Tres patios por talla, aforo real y QR de recogida. Sin hueco inventado.</p>
          <div class="hero-actions">
            <a class="btn btn-primary" routerLink="/grupos">Ver manadas</a>
            <a class="btn btn-secondary" routerLink="/checkout">Reservar el día</a>
          </div>
        </div>
        <img class="hero-art" src="/assets/patio-medianos.svg" alt="Patio de manada mediana con seto y grava" />
      </section>
      @if (error()) {
        <section class="state-screen">
          <h2>No pudimos abrir el patio</h2>
          <p class="lede">{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (loading()) {
        <div class="cards">
          <div class="card skeleton"></div>
          <div class="card skeleton"></div>
          <div class="card skeleton"></div>
        </div>
      } @else if (!groups().length) {
        <section class="state-screen">
          <h2>Hoy no hay manadas publicadas</h2>
          <p class="lede">Vuelve más tarde o escribe a recepción.</p>
        </section>
      } @else {
        <div class="cards">
          @for (g of groups(); track g.id) {
            <a class="card" [routerLink]="['/grupos', g.id]">
              <img [src]="g.photoUrl" [alt]="'Patio de ' + g.name" />
              <div class="card-body">
                <span class="badge" [class.badge-free]="g.freeSlotsToday > 0" [class.badge-busy]="g.freeSlotsToday === 0">
                  {{ g.occupancyLabel }} · {{ g.freeSlotsToday }} huecos hoy
                </span>
                <h3>{{ g.name }}</h3>
                <p class="muted">{{ euros(g.priceCents) }} · talla {{ g.size }} · aforo {{ g.capacity }}</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class HomePageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly groups = signal<PlayGroup[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  euros = euros;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.groups().subscribe({
      next: (rows) => {
        this.groups.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('El patio no responde. Prueba de nuevo.');
        this.loading.set(false);
      },
    });
  }
}
