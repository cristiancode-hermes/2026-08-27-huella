import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Booking, euros } from '../shared/models';

@Component({
  selector: 'app-pass-public',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (error()) {
        <section class="state-screen">
          <h1>Pase no válido</h1>
          <p class="lede">{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/">Ir al patio</a>
        </section>
      } @else if (!booking()) {
        <p class="muted">Abriendo pase…</p>
      } @else {
        <h1>Pase de recogida</h1>
        <p class="code">{{ booking()!.code }}</p>
        <p>{{ booking()!.dog?.name }} · {{ booking()!.playGroup?.name }} · {{ booking()!.visitDate }}</p>
        <p>Estado: {{ booking()!.status }}</p>
        @if (qr()) {
          <div class="qr" [innerHTML]="qr()"></div>
        }
        <p><strong>{{ euros(booking()!.totalCents) }}</strong></p>
      }
    </div>
  `,
})
export class PassPublicPageComponent implements OnInit {
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
      error: () => this.error.set('Este código no corresponde a un pase vivo.'),
    });
  }
}
