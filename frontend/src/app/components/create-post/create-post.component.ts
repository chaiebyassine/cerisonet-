import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PostsService } from '../../services/posts.service';
import { NotificationBannerComponent } from '../notification-banner/notification-banner.component';

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationBannerComponent],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.css'
})
export class CreatePostComponent {
  @Output() postCreated = new EventEmitter<any>();

  postText = '';     // Texte saisi dans le champ
  hashtagInput = ''; // Hashtags saisis (ex: "#angular nodejs, express")
  imageUrl = '';     // URL de l'image à inclure dans le post
  isLoading = false; // Désactive le bouton pendant l'envoi pour éviter les doubles clics

  showBanner = false;
  bannerType: 'success' | 'error' = 'success';
  bannerMessage = '';

  constructor(private postsService: PostsService) {}

  onCreatePost() {
    // Seule validation côté client : refuser un post avec texte vide.
    // Toutes les autres validations (format URL, hashtags...) sont faites par le backend.
    if (!this.postText.trim()) {
      this.bannerType = 'error';
      this.bannerMessage = 'Le post ne peut pas être vide';
      this.showBanner = true;
      return;
    }

    this.isLoading = true;

    const postData = {
      body: this.postText.trim(),
      hashtagInput: this.hashtagInput, 
      image: this.imageUrl.trim() ? { url: this.imageUrl.trim(), title: '' } : null
    };

    this.postsService.createPost(postData).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.ok) {
          this.bannerType = 'success';
          this.bannerMessage = 'Post publié avec succès !';
          this.showBanner = true;

          // On vide tous les champs après publication
          this.postText = '';
          this.hashtagInput = '';
          this.imageUrl = '';

          // On notifie le WallComponent pour qu'il ajoute le post en tête de liste
          this.postCreated.emit(response.post);

          // On masque le message de succès après 2 secondes
          setTimeout(() => {
            this.showBanner = false;
          }, 2000);
        } else {
          this.bannerType = 'error';
          this.bannerMessage = response.message || 'Erreur lors de la publication';
          this.showBanner = true;
        }
      },
      error: () => {
        this.isLoading = false;
        this.bannerType = 'error';
        this.bannerMessage = 'Erreur serveur : impossible de publier le post';
        this.showBanner = true;
      }
    });
  }

  onClear() {
    this.postText = '';
    this.hashtagInput = '';
    this.imageUrl = '';
    this.showBanner = false;
  }
}
