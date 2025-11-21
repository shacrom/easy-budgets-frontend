import { MatPaginatorIntl } from '@angular/material/paginator';

function buildRangeLabel(page: number, pageSize: number, length: number): string {
  if (length === 0 || pageSize === 0) {
    return 'Mostrando 0 de 0';
  }

  const startIndex = page * pageSize;
  const endIndex = Math.min(startIndex + pageSize, length);
  return `Mostrando ${startIndex + 1} – ${endIndex} de ${length}`;
}

export function spanishPaginatorIntl(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();
  intl.itemsPerPageLabel = 'Resultados por página';
  intl.nextPageLabel = 'Siguiente';
  intl.previousPageLabel = 'Anterior';
  intl.firstPageLabel = 'Primera página';
  intl.lastPageLabel = 'Última página';
  intl.getRangeLabel = buildRangeLabel;
  return intl;
}
