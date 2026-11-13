import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'taxIdFormat',
  standalone: true,
})
export class TaxIdFormatPipe implements PipeTransform {
  transform(taxId: string | null | undefined): string {
    if (!taxId) {
      return '';
    }
    return taxId.trim().toUpperCase();
  }
}

