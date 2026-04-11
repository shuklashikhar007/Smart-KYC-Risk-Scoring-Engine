import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { KycScoreRecord } from '../models/kyc-score.model';

@Injectable({ providedIn: 'root' })
export class KycScoreApiService {
  private readonly http = inject(HttpClient);
  private readonly backendUrl = this.resolveBackendUrl();

  scoreCsv(file: File): Observable<KycScoreRecord[]> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<KycScoreRecord[]>(`${this.backendUrl}/score`, formData);
  }

  private resolveBackendUrl(): string {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

    const configuredUrl =
      env?.['BACKEND_URL'] ??
      env?.['NG_APP_BACKEND_URL'] ??
      env?.['VITE_BACKEND_URL'] ??
      'http://localhost:8000';

    return configuredUrl.replace(/\/$/, '');
  }
}
