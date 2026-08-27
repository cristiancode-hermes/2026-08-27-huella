import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-dog-form',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="wrap">
      <h1>{{ id ? 'Ficha' : 'Nuevo perro' }}</h1>
      @if (error()) {
        <section class="state-screen">
          <h2>No se pudo abrir la ficha</h2>
          <p class="lede">{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/perros">Volver</a>
        </section>
      } @else {
        <form (ngSubmit)="save()" class="form-stack">
          <label for="name">Nombre</label>
          <input id="name" name="name" autocomplete="off" [ngModel]="name()" (ngModelChange)="name.set($event)" />
          <label for="size">Talla</label>
          <select id="size" name="size" [ngModel]="size()" (ngModelChange)="size.set($event)">
            <option value="S">S — pequeños</option>
            <option value="M">M — medianos</option>
            <option value="L">L — grandes</option>
          </select>
          <label for="rabies">Rabia vigente hasta</label>
          <input id="rabies" name="rabies" type="date" [ngModel]="rabies()" (ngModelChange)="rabies.set($event)" />
          <label for="poly">Polivalente vigente hasta</label>
          <input id="poly" name="poly" type="date" [ngModel]="poly()" (ngModelChange)="poly.set($event)" />
          <label for="temp">Carácter</label>
          <select id="temp" name="temp" [ngModel]="temp()" (ngModelChange)="temp.set($event)">
            <option value="social">Social</option>
            <option value="shy">Tímido</option>
            <option value="playful">Juguetón</option>
          </select>
          @if (formError()) {
            <p class="form-error" role="alert">{{ formError() }}</p>
          }
          <button class="btn btn-primary" type="submit">Guardar ficha</button>
        </form>
      }
    </div>
  `,
})
export class DogFormPageComponent implements OnInit {
  @Input() id = '';
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly name = signal('');
  readonly size = signal<'S' | 'M' | 'L'>('M');
  readonly rabies = signal('');
  readonly poly = signal('');
  readonly temp = signal('social');
  readonly error = signal('');
  readonly formError = signal('');

  ngOnInit() {
    if (!this.id || this.id === 'nuevo') return;
    this.api.dog(this.id).subscribe({
      next: (d) => {
        this.name.set(d.name);
        this.size.set(d.size);
        this.rabies.set(d.vaccines?.rabiesUntil || '');
        this.poly.set(d.vaccines?.polyvalentUntil || '');
        this.temp.set(d.temperament);
      },
      error: () => this.error.set('Esa ficha no existe o no es tuya.'),
    });
  }

  save() {
    this.formError.set('');
    if (!this.name() || !this.rabies() || !this.poly()) {
      this.formError.set('Nombre y ambas vacunas son obligatorios.');
      return;
    }
    const body = {
      name: this.name(),
      size: this.size(),
      vaccines: { rabiesUntil: this.rabies(), polyvalentUntil: this.poly() },
      temperament: this.temp() as 'social' | 'shy' | 'playful',
    };
    const req = this.id && this.id !== 'nuevo' ? this.api.patchDog(this.id, body) : this.api.createDog(body);
    req.subscribe({
      next: () => void this.router.navigateByUrl('/perros'),
      error: () => this.formError.set('No se pudo guardar la ficha.'),
    });
  }
}
