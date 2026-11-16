

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NotificationBannerComponent } from '../../components/notification-banner/notification-banner.component';
import { PostItemComponent } from '../../components/post-item/post-item.component';
import { CreatePostComponent } from '../../components/create-post/create-post.component';
import { AuthService, SessionResponse } from '../../services/auth.service';
import { PostsService, Post } from '../../services/posts.service';
import { WebSocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-wall',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationBannerComponent, PostItemComponent, CreatePostComponent],
  templateUrl: './wall.component.html',
  styleUrl: './wall.component.css'
})
export class WallComponent implements OnInit, OnDestroy {
  user: any = null;
  lastLogin: string | null = localStorage.getItem('lastLogin');

  
  allPosts: Post[] = [];
  posts: Post[] = [];
  isLoadingPosts = true;
  isLoadingMore = false;
  currentPage = 1;
  hasMore = false;

  showBanner = true;
  bannerMessage = '';

  // Options de tri et filtrage
  sortBy: string = 'date';
  filterMode: string = 'all';
  filterHashtag: string = '';

  connectedUsers: any[] = [];

  // On stocke les abonnements WebSocket pour les désabonner proprement dans ngOnDestroy
 
  private subs: Subscription[] = [];

  constructor(
    private auth: AuthService,
    private postsService: PostsService,
    private router: Router,
    private ws: WebSocketService
  ) {}

  ngOnInit(): void {
    // Au chargement du composant, on vérifie d'abord que la session est active.
    // Si quelqu'un accède à /wall sans être connecté (ou après expiration),
    // on le redirige vers /login.
    this.auth.session().subscribe({
      next: (res: SessionResponse) => {
        if (!res.connected) {
          this.router.navigate(['/login']);
        } else {
          this.user = res.user;
          this.bannerMessage = `Connexion réussie : bonjour ${this.user?.pseudo ?? ''}`;
          this.loadPosts();

          // On s'identifie auprès du serveur WebSocket pour apparaître dans la liste des connectés
          this.ws.emit('userConnected', { id: this.user.id, pseudo: this.user.pseudo });

          // Écouter les mises à jour de la liste des connectés
          this.subs.push(
            this.ws.on('connectedUsers').subscribe((users: any[]) => {
              this.connectedUsers = users;
            })
          );

          // Écouter les likes en temps réel.
          // Quand quelqu'un like un post, le serveur émet 'postLiked' à tout le monde.
          // On met à jour le post concerné et on rappelle applyFiltersAndSort()
          // pour forcer Angular à re-rendre la vue (ngZone issue avec les Observables externes).
          this.subs.push(
            this.ws.on('postLiked').subscribe((data: { postId: string; likes: any }) => {
              const post = this.allPosts.find(p => p._id === data.postId);
              if (post) {
                post.likes = data.likes;
                this.applyFiltersAndSort();
              }
            })
          );

          // Écouter les partages en temps réel
          this.subs.push(
            this.ws.on('postShared').subscribe((post: any) => {
              this.allPosts.unshift(post);
              this.applyFiltersAndSort();
            })
          );
        }
      },
      error: () => this.router.navigate(['/login'])
    });
  }

  // ngOnDestroy est appelé quand l'utilisateur quitte la page.
 
  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.ws.disconnect();
  }

  // Charge les posts depuis le serveur (première page)
  loadPosts(): void {
    this.isLoadingPosts = true;
    this.currentPage = 1;
    this.postsService.getPosts(1, 50).subscribe({
      next: (response) => {
        if (response.ok && response.posts) {
          this.allPosts = response.posts;
          this.hasMore = response.hasMore ?? false;
          this.applyFiltersAndSort();
        }
        this.isLoadingPosts = false;
      },
      error: () => {
        console.error('Erreur lors du chargement des posts');
        this.isLoadingPosts = false;
      }
    });
  }

  // Charge la page suivante et ajoute les posts à la suite
  loadMore(): void {
    this.isLoadingMore = true;
    this.currentPage++;
    this.postsService.getPosts(this.currentPage, 50).subscribe({
      next: (response) => {
        if (response.ok && response.posts) {
          this.allPosts.push(...response.posts);
          this.hasMore = response.hasMore ?? false;
          this.applyFiltersAndSort();
        }
        this.isLoadingMore = false;
      },
      error: () => {
        this.isLoadingMore = false;
        this.currentPage--;
      }
    });
  }

  // Applique les filtres et le tri actifs sur allPosts et met à jour posts (la vue).
  // Cette méthode est appelée à chaque changement de filtre, tri, ou événement WebSocket.
  applyFiltersAndSort(): void {
    let result = [...this.allPosts]; // copie pour ne pas modifier la source

    // Filtre : afficher seulement mes posts
    if (this.filterMode === 'mine' && this.user) {
      result = result.filter(p => p.createdBy === this.user.id);
    }

    // Filtre par hashtag (recherche partielle, insensible à la casse)
    if (this.filterHashtag.trim()) {
      const tag = this.filterHashtag.trim().toLowerCase();
      result = result.filter(p =>
        (p.hashtags || p.tags || []).some((h: string) => h.toLowerCase().includes(tag))
      );
    }

    // Tri
    if (this.sortBy === 'date') {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (this.sortBy === 'author') {
      result.sort((a, b) => (a.authorName || '').localeCompare(b.authorName || ''));
    } else if (this.sortBy === 'likes') {
      result.sort((a, b) => {
        const la = Array.isArray(a.likes) ? a.likes.length : (a.likes || 0);
        const lb = Array.isArray(b.likes) ? b.likes.length : (b.likes || 0);
        return lb - la;
      });
    }

    // Les posts partagés apparaissent toujours en premier,
    // puis les posts de l'utilisateur connecté, puis les autres
    result.sort((a, b) => {
      const aScore = (b.shared ? 2 : 0) + (String(b.createdBy) === String(this.user?.id) ? 1 : 0);
      const bScore = (a.shared ? 2 : 0) + (String(a.createdBy) === String(this.user?.id) ? 1 : 0);
      return aScore - bScore;
    });

    this.posts = result;
  }

  // Reçu depuis CreatePostComponent via @Output : on ajoute le post en tête de liste
  onPostCreated(newPost: Post): void {
    this.allPosts.unshift(newPost);
    this.applyFiltersAndSort();
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        localStorage.removeItem('lastLogin');
        this.ws.disconnect();
        this.router.navigate(['/login']);
      },
      error: () => {
        localStorage.removeItem('lastLogin');
        this.ws.disconnect();
        this.router.navigate(['/login']);
      }
    });
  }
}