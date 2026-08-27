import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API, Addon, Booking, Dog, OccupancyPoint, PlayGroup, Slot } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  groups() {
    return this.http.get<PlayGroup[]>(`${API}/groups`);
  }
  group(id: string) {
    return this.http.get<PlayGroup>(`${API}/groups/${id}`);
  }
  slots(id: string, date: string) {
    return this.http.get<{
      date: string;
      yard: { date: string; status: string; note: string | null };
      freeSlotsToday: number;
      dropOff: Slot[];
      pickUp: Slot[];
    }>(`${API}/groups/${id}/slots`, { params: { date } });
  }
  addons() {
    return this.http.get<Addon[]>(`${API}/addons`);
  }
  dogs() {
    return this.http.get<Dog[]>(`${API}/dogs`);
  }
  dog(id: string) {
    return this.http.get<Dog>(`${API}/dogs/${id}`);
  }
  createDog(body: Partial<Dog>) {
    return this.http.post<Dog>(`${API}/dogs`, body);
  }
  patchDog(id: string, body: Partial<Dog>) {
    return this.http.patch<Dog>(`${API}/dogs/${id}`, body);
  }
  hold(body: {
    dogId: string;
    playGroupId: string;
    visitDate: string;
    dropOffSlotId: string;
    pickUpSlotId: string;
    addonIds: string[];
  }) {
    return this.http.post<Booking>(`${API}/bookings/hold`, body);
  }
  confirm(id: string) {
    return this.http.post<Booking>(`${API}/bookings/${id}/confirm`, {});
  }
  cancel(id: string) {
    return this.http.post<Booking>(`${API}/bookings/${id}/cancel`, {});
  }
  bookings() {
    return this.http.get<Booking[]>(`${API}/bookings`);
  }
  booking(id: string) {
    return this.http.get<Booking>(`${API}/bookings/${id}`);
  }
  ticket(code: string) {
    return this.http.get<Booking>(`${API}/bookings/ticket/${code}`);
  }
  checkIn(codeOrUrl: string) {
    return this.http.post<Booking>(`${API}/staff/check-in`, { codeOrUrl });
  }
  checkOut(codeOrUrl: string) {
    return this.http.post<Booking>(`${API}/staff/check-out`, { codeOrUrl });
  }
  pack() {
    return this.http.get<Booking[]>(`${API}/staff/pack`);
  }
  stats() {
    return this.http.get<{ series: OccupancyPoint[] }>(`${API}/staff/stats`);
  }
  review(body: { bookingId: string; rating: number; comment?: string }) {
    return this.http.post(`${API}/reviews`, body);
  }
}
