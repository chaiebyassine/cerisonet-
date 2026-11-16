// post-item.component.ts — Composant qui affiche UN post et toutes ses interactions
// Chaque post de la liste est rendu par ce composant.
// Il gère : les likes (via WebSocket) et les commentaires.

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Post, PostsService } from '../../services/posts.service';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-post-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './post-item.component.html',
  styleUrl: './post-item.component.css'
})
export class PostItemComponent {
  @Input() post!: Post;
  @Input() currentUserId!: number;
  @Input() currentUserPseudo!: string;
  @Output() postShared = new EventEmitter<any>();

  showComments = false;
  commentText = '';
  isSubmitting = false;
  isSharing = false;
  shareMessage = '';

  constructor(
    private postsService: PostsService,
    private ws: WebSocketService
  ) {}



  hasLiked(): boolean {
    if (!Array.isArray(this.post.likes)) return false;
    return this.post.likes.some(id => String(id) === String(this.currentUserId));
  }

  getLikesCount(): number {
    return Array.isArray(this.post.likes) ? this.post.likes.length : (this.post.likes || 0);
  }

  toggleLike(): void {
    if (!this.post._id) return;
    this.ws.emit('likePost', { postId: this.post._id, userId: this.currentUserId });
  }

  isMySharedPost(): boolean {
    return !!this.post.shared && String(this.post.createdBy) === String(this.currentUserId);
  }

  sharePost(): void {
    if (!this.post._id || this.isSharing) return;
    this.isSharing = true;
    this.ws.emit('sharePost', {
      postId: this.post._id,
      userId: this.currentUserId,
      pseudo: this.currentUserPseudo
    });
    setTimeout(() => {
      this.shareMessage = 'Post partagé !';
      this.isSharing = false;
      setTimeout(() => this.shareMessage = '', 2000);
    }, 500);
  }

  toggleComments(): void {
    this.showComments = !this.showComments;
  }

  getComments(): any[] {
    return this.post.comments || this.post.commentaires || [];
  }

  submitComment(): void {
    if (!this.commentText.trim() || !this.post._id) return;
    this.isSubmitting = true;
    this.postsService.addComment(this.post._id, this.commentText.trim()).subscribe({
      next: (res) => {
        if (res.ok && res.comment) {
          const comments = this.post.comments || this.post.commentaires || [];
          comments.push(res.comment);
          this.post.comments = comments;
          this.commentText = '';
        }
        this.isSubmitting = false;
      },
      error: () => { this.isSubmitting = false; }
    });
  }

}
