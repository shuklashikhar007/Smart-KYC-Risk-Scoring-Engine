import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { KycScoreRecord } from '../../models/kyc-score.model';

@Component({
  selector: 'app-kyc-table',
  templateUrl: './kyc-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KycTable {
  readonly kycData = input<KycScoreRecord[]>([]);
}