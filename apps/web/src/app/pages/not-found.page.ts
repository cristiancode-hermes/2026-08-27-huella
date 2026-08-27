import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="wrap state-screen">
      <h1>Esa senda no existe</h1>
      <p class="lede">El patio está en la portada.</p>
      <a class="btn btn-primary" routerLink="/">Volver</a>
    </div>
  `,
})
export class NotFoundPageComponent {}
