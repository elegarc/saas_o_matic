import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorResponse } from '../models/api-error.model';

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: unknown) => {
      let userFriendlyMessage = 'Ha ocurrido un error inesperado al conectar con el servidor.';

      if (error instanceof HttpErrorResponse) {
        if (error.status === 0) {
          userFriendlyMessage =
            'No se puede conectar con el backend. Verifique que el servicio esté ejecutándose en el puerto 8000.';
        } else if (error.error && typeof error.error === 'object') {
          const apiError = error.error as ErrorResponse;
          if (apiError.message) {
            userFriendlyMessage = apiError.message;
          } else if (error.status === 404) {
            userFriendlyMessage = 'El recurso solicitado no fue encontrado.';
          } else if (error.status === 409) {
            userFriendlyMessage = 'Ya existe un registro con esos mismos datos identificativos.';
          } else if (error.status === 422) {
            userFriendlyMessage = 'Los datos introducidos no superan la validación requerida.';
          }
        }
      }

      return throwError(() => new Error(userFriendlyMessage));
    })
  );
};

