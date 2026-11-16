import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-notification-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-banner.component.html',
  styleUrls: ['./notification-banner.component.css']
})
export class NotificationBannerComponent {
  @Input() show = false;
  @Input() type: 'success' | 'error' = 'success';
  @Input() message = '';
}