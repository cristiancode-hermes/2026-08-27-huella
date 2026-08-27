import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-panel">
      <aside class="auth-brand">
        <p class="brand-kicker">Huella</p>
        <h1>Registra al tutor. Luego ficha al perro.</h1>
      </aside>
      <div class="auth-form-side">
        <h2>Crear cuenta</h2>
        <form (ngSubmit)="submit()">
          <label for="username">Usuario</label>
          <input id="username" name="username" type="text" autocomplete="off"
            [ngModel]="username()" (ngModelChange)="username.set($event)" />
          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="off"
            [ngModel]="email()" (ngModelChange)="email.set($event)" />
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" autocomplete="new-password"
            [ngModel]="password()" (ngModelChange)="password.set($event)" />
          @if (error()) {
            <p class="form-error" role="alert">{{ error() }}</p>
          }
          <button class="btn btn-primary" type="submit" [disabled]="auth.loading()">Crear cuenta</button>
        </form>
        <p class="auth-alt">¿Ya tienes ficha? <a routerLink="/login">Entrar</a></p>
      </div>
    </div>
  `,
})
export class RegisterPageComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly username = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal('');

  submit() {
    this.error.set('');
    if (!this.username() || !this.email() || !this.password()) {
      this.error.set('Completa usuario, email y contraseña');
      return;
    }
    this.auth.register({
      username: this.username(),
      email: this.email(),
      password: this.password(),
    }).subscribe({
      next: () => void this.router.navigateByUrl('/perros/nuevo'),
      error: (err) => this.error.set(err?.error?.message || 'No se pudo registrar'),
    });
  }
}
