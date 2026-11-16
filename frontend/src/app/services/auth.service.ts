// auth.service.ts — Service Angular pour l'authentification
// Un service Angular est un objet injecté partout dans l'appli (singleton).
// Ce service centralise tous les appels HTTP liés à la connexion / déconnexion.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface qui décrit la structure de la réponse du serveur après un login
export interface LoginResponse {
  ok: boolean;
  message: string;
  user?: any;
}

// Interface pour la vérification de session (GET /api/session)
export interface SessionResponse {
  connected: boolean;
  user?: any;
}

@Injectable({
  providedIn: 'root' // ce service est disponible dans toute l'appli sans l'importer dans un module
})
export class AuthService {
  private api = 'https://pedago.univ-avignon.fr:3143/api';

  constructor(private http: HttpClient) {}

  // Envoie les identifiants au serveur. withCredentials:true est indispensable
  // pour que le cookie de session soit envoyé et reçu même entre deux ports différents.
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.api}/login`,
      { email, password },
      { withCredentials: true }
    );
  }

  // Vérifie si une session est active côté serveur.
  // Appelé au chargement du mur : si la session a expiré, on redirige vers /login.
  session(): Observable<SessionResponse> {
    return this.http.get<SessionResponse>(
      `${this.api}/session`,
      { withCredentials: true }
    );
  }

  // Détruit la session côté serveur et remet statut_connexion à 0 dans PostgreSQL
  logout(): Observable<{ ok: boolean; message: string }> {
    return this.http.post<{ ok: boolean; message: string }>(
      `${this.api}/logout`,
      {},
      { withCredentials: true }
    );
  }
}