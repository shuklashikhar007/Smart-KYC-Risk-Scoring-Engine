import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kyc-table',
  standalone: true,
  templateUrl: './kyc-table.html'
})
export class KycTable {
  // The @Input decorator tells Angular that this data will be handed down from the parent
  // It starts as an empty array, and fills up when the API request succeeds
  @Input() kycData: any[] = []; 
}