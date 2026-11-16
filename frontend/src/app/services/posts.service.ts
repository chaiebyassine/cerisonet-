// posts.service.ts — Service Angular pour toutes les opérations sur les posts
// Centralise les appels HTTP vers /api/posts.

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PostData {
  body: string;
  hashtags?: string[];
  image?: { url: string; title: string } | null;
}

// Interface TypeScript qui décrit la structure d'un post tel que reçu du serveur.
export interface Post {
  _id?: string;          
  auteur?: string;       
  createdBy?: number;    
  authorName?: string;   
  authorAvatar?: string; 
  body?: string;         
  texte?: string;        
  likes: any[] | number; 
  date: any;
  hour?: string;
  comments?: any[];      
  commentaires?: any[];  
  hashtags?: string[];   
  tags?: string[];       
  image?: { url: string; title: string };
  shared?: boolean;      
  sharedFrom?: { originalId: string; originalCreatedBy?: number }; 
}

export interface PostsResponse {
  ok: boolean;
  posts?: Post[];
  total?: number;
  page?: number;
  hasMore?: boolean;
  message?: string;
}

export interface CreatePostResponse {
  ok: boolean;
  message: string;
  post?: Post;
}

@Injectable({
  providedIn: 'root'
})
export class PostsService {
  private api = 'https://pedago.univ-avignon.fr:3143/api';

  constructor(private http: HttpClient) {}

  // Récupérer les posts avec pagination
  getPosts(page: number = 1, limit: number = 5): Observable<PostsResponse> {
    return this.http.get<PostsResponse>(
      `${this.api}/posts?page=${page}&limit=${limit}`,
      { withCredentials: true }
    );
  }

  // Créer un nouveau post
  createPost(postData: PostData): Observable<CreatePostResponse> {
    return this.http.post<CreatePostResponse>(
      `${this.api}/posts`,
      postData,
      { withCredentials: true }
    );
  }

  // Ajouter un commentaire à un post
  addComment(postId: string, texte: string): Observable<{ ok: boolean; comment?: any; message?: string }> {
    return this.http.post<{ ok: boolean; comment?: any; message?: string }>(
      `${this.api}/posts/${postId}/comment`,
      { texte },
      { withCredentials: true }
    );
  }
}
