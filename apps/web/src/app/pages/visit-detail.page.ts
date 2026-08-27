import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Booking, euros, humanConflict } from '../shared/models';

@Component({
  selector: 'app-visit-detail',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="wrap">
      @if (error()) {
        <section class="state-screen">
          <h1>Visita no encontrada</h1>
          <p class="lede">{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/mis-visitas">Volver</a>
        </section>
      } @else if (!b()) {
        <p class="muted">Cargando visita…</p>
      } @else {
        <h1>{{ b()!.dog?.name }} · {{ b()!.visitDate }}</h1>
        <p class="muted">{{ b()!.playGroup?.name }} · {{ b()!.status }} · {{ b()!.code }}</p>
        <ul class="summary">
          @for (l of b()!.lines || []; track l.id) {
            <li><span>{{ l.label }}</span><span>{{ euros(l.subtotalCents) }}</span></li>
          }
        </ul>
        <p><strong>Total {{ euros(b()!.totalCents) }}</strong></p>
        @if (qr()) {
          <div class="qr" [innerHTML]="qr()"></div>
        }
        @if (b()!.status === 'picked_up') {
          <form (ngSubmit)="review()">
            <label for="rating">Valoración</label>
            <input id="rating" type="number" min="1" max="5" [ngModel]="rating()" (ngModelChange)="rating.set($event)" name="rating" />
            <button class="btn btn-secondary" type="submit">Enviar reseña</button>
          </form>
        }
        @if (actionError()) {
          <p class="form-error" id="hold-action">{{ actionError() }}</p>
        }
        @if (b()!.status === 'pending' || b()!.status === 'confirmed') {
          <button class="btn btn-ghost" type="button" (click)="cancel()">Cancelar visita</button>
        }
      }
    </div>
  `,
})
export class VisitDetailPageComponent implements OnInit {
  @Input() id = '';
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly b = signal<Booking | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly rating = signal(5);
  euros = euros;

  ngOnInit() {
    this.api.booking(this.id).subscribe({
      next: (b) => {
        this.b.set(b);
        if (b.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(b.qrSvg));
      },
      error: () => this.error.set('No hay visita con ese identificador.'),
    });
  }

  cancel() {
    this.actionError.set('');
    this.api.cancel(this.id).subscribe({
      next: (b) => this.b.set(b),
      error: (err) => this.actionError.set(humanConflict(err)),
    });
  }

  review() {
    this.api.review({ bookingId: this.id, rating: Number(this.rating()) }).subscribe({
      next: () => this.actionError.set('Gracias por la reseña.'),
      error: (err) => this.actionError.set(humanConflict(err)),
    });
  }
}
