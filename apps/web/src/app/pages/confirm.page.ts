import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Booking, euros } from '../shared/models';

@Component({
  selector: 'app-confirm',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (error()) {
        <section class="state-screen">
          <h1>No encontramos esa confirmación</h1>
          <p class="lede">{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/mis-visitas">Mis visitas</a>
        </section>
      } @else if (!booking()) {
        <p class="muted">Cargando pase…</p>
      } @else {
        <h1>Pase listo</h1>
        <p class="lede">{{ booking()!.dog?.name }} en {{ booking()!.playGroup?.name }} · {{ booking()!.visitDate }}</p>
        <p class="code">{{ booking()!.code }}</p>
        @if (qr()) {
          <div class="qr" [innerHTML]="qr()"></div>
        }
        <p><a [href]="booking()!.qrUrl" target="_blank" rel="noopener">Abrir pase público</a></p>
        <p><strong>{{ euros(booking()!.totalCents) }}</strong></p>
        <a class="btn btn-secondary" [routerLink]="['/mis-visitas', booking()!.id]">Ver detalle</a>
      }
    </div>
  `,
})
export class ConfirmPageComponent implements OnInit {
  @Input() code = '';
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly booking = signal<Booking | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly error = signal('');
  euros = euros;

  ngOnInit() {
    this.api.ticket(this.code).subscribe({
      next: (b) => {
        this.booking.set(b);
        if (b.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(b.qrSvg));
      },
      error: () => this.error.set('El pase no está disponible.'),
    });
  }
}
