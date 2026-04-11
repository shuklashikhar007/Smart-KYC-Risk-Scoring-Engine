import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Needed for basic directives

import { Header } from './components/header/header';
import { ImportPanel } from './components/import-panel/import-panel';
import { KycTable } from './components/kyc-table/kyc-table';
import { KycScoreRecord } from './models/kyc-score.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    Header, 
    ImportPanel, 
    KycTable
  ],
  templateUrl: './app.html'
})
export class App {
  // This variable will hold the real data coming from your Python backend
  realKycData: KycScoreRecord[] = [];

  // This function is triggered when the ImportPanel gets the API response
  onDataReceived(dataFromBackend: KycScoreRecord[]) {
    console.log("Data successfully received in Parent App:", dataFromBackend);
    this.realKycData = dataFromBackend;
  }
}