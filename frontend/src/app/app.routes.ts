import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { WallComponent } from './pages/wall/wall.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'wall', component: WallComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];