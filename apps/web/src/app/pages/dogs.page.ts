import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Dog } from '../shared/models';

@Component({
  selector: 'app-dogs',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Mis perros</h1>
      <p class="lede">Sin ficha no hay hueco. Vacunas en vigor y talla de manada.</p>
      <a class="btn btn-primary" routerLink="/perros/nuevo">Fichar perro</a>
      @if (error()) {
        <section class="state-screen">
          <h2>No pudimos cargar las fichas</h2>
          <p class="lede">{{ error() }}</p>
          <button class="btn btn-secondary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!dogs().length) {
        <section class="state-screen">
          <h2>Todavía no hay perros</h2>
          <p class="lede">Empieza por la ficha: nombre, talla y vacunas.</p>
          <a class="btn btn-primary" routerLink="/perros/nuevo">Fichar el primero</a>
        </section>
      } @else {
        <div class="cards">
          @for (d of dogs(); track d.id) {
            <a class="card" [routerLink]="['/perros', d.id]">
              <img [src]="d.photoUrl || '/assets/dog-nala.svg'" [alt]="d.name" />
              <div class="card-body">
                <h3>{{ d.name }}</h3>
                <p class="muted">Talla {{ d.size }} · {{ d.ready ? 'Listo para patio' : 'Faltan vacunas' }}</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class DogsPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly dogs = signal<Dog[]>([]);
  readonly error = signal('');

  ngOnInit() {
    this.load();
  }

  load() {
    this.error.set('');
    this.api.dogs().subscribe({
      next: (rows) => this.dogs.set(rows),
      error: () => this.error.set('Revisa la sesión e inténtalo otra vez.'),
    });
  }
}
