import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { PlayGroup, euros } from '../shared/models';

@Component({
  selector: 'app-groups',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Manadas</h1>
      <p class="lede">Los huecos de hoy son los mismos que en portada. Aforo compartido, no un asiento 1:1.</p>
      @if (error()) {
        <section class="state-screen">
          <h2>No hay listado</h2>
          <p class="lede">{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (loading()) {
        <p class="muted">Cargando patios…</p>
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
                <p>{{ g.description }}</p>
                <p class="muted">{{ euros(g.priceCents) }} · talla {{ g.size }}</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class GroupsPageComponent implements OnInit {
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
        this.error.set('No pudimos cargar las manadas.');
        this.loading.set(false);
      },
    });
  }
}
