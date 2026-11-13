import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CountryInfo, PlanInfo } from '../models/catalog.model';

@Injectable({
  providedIn: 'root',
})
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  getCountries(): Observable<CountryInfo[]> {
    return this.http.get<CountryInfo[]>(`${this.baseUrl}/countries`);
  }

  getPlans(): Observable<PlanInfo[]> {
    return this.http.get<PlanInfo[]>(`${this.baseUrl}/plans`);
  }
}

