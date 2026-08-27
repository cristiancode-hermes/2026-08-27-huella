import { Component, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-account',
  template: `
    <div class="wrap">
      <h1>Cuenta</h1>
      @if (auth.user(); as u) {
        <p>{{ u.username }} · {{ u.email }}</p>
        <p>Puntos de patio: <strong>{{ u.points }}</strong> (10 por visita recogida)</p>
        <button class="btn btn-ghost" type="button" (click)="auth.logout()">Salir</button>
      }
    </div>
  `,
})
export class AccountPageComponent {
  readonly auth = inject(AuthService);
}
