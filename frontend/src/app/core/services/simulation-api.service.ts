import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Simulation, SimulationCreateRequest } from '../models/simulation.model';

@Injectable({
  providedIn: 'root',
})
export class SimulationApiService {
  private readonly http = inject(HttpClient);

  createSimulation(payload: SimulationCreateRequest): Observable<Simulation> {
    return this.http.post<Simulation>('/api/v1/simulations', payload);
  }

  getCustomerSimulations(customerId: number): Observable<Simulation[]> {
    return this.http.get<Simulation[]>(`/api/v1/customers/${customerId}/simulations`);
  }
}

