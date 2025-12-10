import { inject, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  private readonly defaultConfig: MatSnackBarConfig = {
    horizontalPosition: 'center',
    verticalPosition: 'bottom'
  };

  /**
   * Shows a success notification (green)
   * @param message The message to display
   * @param duration Duration in milliseconds (default: 3000)
   */
  showSuccess(message: string, duration = 3000): void {
    this.show(message, 'success', duration);
  }

  /**
   * Shows an error notification (red)
   * @param message The message to display
   * @param duration Duration in milliseconds (default: 5000)
   */
  showError(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  /**
   * Shows a warning notification (orange)
   * @param message The message to display
   * @param duration Duration in milliseconds (default: 4000)
   */
  showWarning(message: string, duration = 4000): void {
    this.show(message, 'warning', duration);
  }

  /**
   * Shows an info notification (blue)
   * @param message The message to display
   * @param duration Duration in milliseconds (default: 3000)
   */
  showInfo(message: string, duration = 3000): void {
    this.show(message, 'info', duration);
  }

  /**
   * Shows a notification with custom type
   * @param message The message to display
   * @param type The notification type
   * @param duration Duration in milliseconds
   */
  private show(message: string, type: NotificationType, duration: number): void {
    this.snackBar.open(message, 'Cerrar', {
      ...this.defaultConfig,
      duration,
      panelClass: [`snackbar-${type}`]
    });
  }

  /**
   * Dismisses any currently shown notification
   */
  dismiss(): void {
    this.snackBar.dismiss();
  }
}
