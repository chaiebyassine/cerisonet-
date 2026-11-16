// login.component.ts — Page de connexion
// Gère le formulaire de login : validation, appel API, redirection, affichage d'erreur.

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationBannerComponent } from '../../components/notification-banner/notification-banner.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationBannerComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email = '';
  password = '';

  showBanner = false;
  bannerType: 'success' | 'error' = 'success';
  bannerMessage = '';

  // On lit la date de la dernière connexion depuis localStorage (stocké côté client)
  // et on l'affiche sur la page de login pour l'expérience utilisateur
  lastLogin: string | null = localStorage.getItem('lastLogin');

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.bannerType = 'success';
        this.showBanner = true;
        this.bannerMessage = `Connexion réussie : bonjour ${res.user?.pseudo ?? ''}`;

        // On sauvegarde la date de connexion pour l'afficher la prochaine fois
        localStorage.setItem('lastLogin', new Date().toLocaleString());

        // On attend 800ms avant de naviguer pour que l'utilisateur voie le message de succès
        setTimeout(() => this.router.navigate(['/wall']), 800);
      },
      error: () => {
        // Le serveur renvoie 401 si email ou mot de passe incorrect
        this.bannerType = 'error';
        this.showBanner = true;
        this.bannerMessage = 'Connexion échouée : informations de connexion incorrectes';
      }
    });
  }
}
