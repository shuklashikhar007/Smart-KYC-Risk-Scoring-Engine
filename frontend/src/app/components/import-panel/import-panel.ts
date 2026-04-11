import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KycScoreRecord } from '../../models/kyc-score.model';
import { KycScoreApiService } from '../../services/kyc-score-api.service';

@Component({
  selector: 'app-import-panel',
  imports: [CommonModule],
  templateUrl: './import-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportPanel {
  fileName: string | null = null;
  selectedFile: File | null = null;
  isUploading = false;
  errorMessage: string | null = null;

  // Emits scored records to the parent app once backend processing succeeds.
  readonly dataScored = output<KycScoreRecord[]>();

  constructor(private readonly kycScoreApiService: KycScoreApiService) {}

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.fileName = file.name;
      this.errorMessage = null; // Clear previous errors
    }
  }

  // The Generate Button triggers the actual API call
  onGenerateReport(): void {
    if (!this.selectedFile) return;
    
    this.isUploading = true;
    this.errorMessage = null;

    this.kycScoreApiService.scoreCsv(this.selectedFile)
      .subscribe({
        next: (response) => {
          this.isUploading = false;
          this.dataScored.emit(response);
        },
        error: (err) => {
          console.error('API Error:', err);
          this.isUploading = false;
          this.errorMessage = 'Failed to score CSV. Check backend URL and server status.';
        }
      });
  }
}