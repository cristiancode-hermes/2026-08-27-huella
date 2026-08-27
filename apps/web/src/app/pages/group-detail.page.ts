import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { PlayGroup, euros } from '../shared/models';

@Component({
  selector: 'app-group-detail',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (error()) {
        <section class="state-screen">
          <h1>Manada no encontrada</h1>
          <p class="lede">{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/grupos">Volver a manadas</a>
        </section>
      } @else if (!group()) {
        <p class="muted">Cargando patio…</p>
      } @else {
        <img class="hero-art" [src]="group()!.photoUrl" [alt]="'Patio de ' + group()!.name" />
        <h1>{{ group()!.name }}</h1>
        <p class="lede">{{ group()!.description }}</p>
        <p>
          <span class="badge" [class.badge-free]="group()!.freeSlotsToday > 0" [class.badge-busy]="group()!.freeSlotsToday === 0">
            {{ group()!.occupancyLabel }} · {{ group()!.freeSlotsToday }} huecos hoy
          </span>
        </p>
        <p class="muted">{{ euros(group()!.priceCents) }} · talla {{ group()!.size }} · aforo {{ group()!.capacity }}</p>
        <a class="btn btn-primary" [routerLink]="['/checkout']" [queryParams]="{ group: group()!.id }">Reservar esta manada</a>
      }
    </div>
  `,
})
export class GroupDetailPageComponent implements OnInit {
  @Input() id = '';
  private readonly api = inject(ApiService);
  readonly group = signal<PlayGroup | null>(null);
  readonly error = signal('');
  euros = euros;

  ngOnInit() {
    this.api.group(this.id).subscribe({
      next: (g) => this.group.set(g),
      error: () => this.error.set('Esa manada no está en el patio.'),
    });
  }
}
