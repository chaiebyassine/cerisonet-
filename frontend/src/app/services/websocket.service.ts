// websocket.service.ts — Service Angular pour la communication en temps réel via Socket.io
// Socket.io permet au serveur d'envoyer des données au client sans que celui-ci ait demandé.
// Ici on l'utilise pour deux choses : les likes en temps réel et la liste des connectés.

import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket;

  constructor() {
    // On se connecte au serveur dès que le service est instancié (au démarrage de l'appli)
    // Socket.io essaie d'abord WebSocket (plus rapide), puis polling HTTP si ça échoue
    this.socket = io('https://pedago.univ-avignon.fr:3143', {
      transports: ['websocket', 'polling']
    });
  }

  // Envoyer un événement au serveur 
  emit(event: string, data: any): void {
    this.socket.emit(event, data);
  }

  // Écouter un événement du serveur. 
  on(event: string): Observable<any> {
    return new Observable(observer => {
      this.socket.on(event, (data: any) => {
        observer.next(data); // chaque fois que le serveur émet cet événement, on le transmet
      });
      // Fonction de nettoyage appelée lors du désabonnement (ngOnDestroy)
      return () => this.socket.off(event);
    });
  }

  // Fermer la connexion WebSocket proprement lors de la déconnexion
  disconnect(): void {
    this.socket.disconnect();
  }
}
