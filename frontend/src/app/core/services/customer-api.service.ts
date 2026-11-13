import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Customer,
  CustomerCreateRequest,
  CustomerListResponse,
} from '../models/customer.model';

@Injectable({
  providedIn: 'root',
})
export class CustomerApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/customers';

  getCustomers(
    query?: string,
    limit: number = 20,
    offset: number = 0
  ): Observable<CustomerListResponse> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    if (query && query.trim()) {
      params = params.set('q', query.trim());
    }

    return this.http.get<CustomerListResponse>(this.baseUrl, { params });
  }

  getCustomerById(customerId: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/${customerId}`);
  }

  createCustomer(payload: CustomerCreateRequest): Observable<Customer> {
    return this.http.post<Customer>(this.baseUrl, payload);
  }
}

