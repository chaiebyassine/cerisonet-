# CERISoNet

Réseau social développé dans le cadre du Master ILSEN de l'Université d'Avignon.
Les utilisateurs se connectent avec leur compte de l'université, publient des messages (avec hashtags et image), les commentent, les aiment et les partagent. Les likes, les partages et la liste des personnes connectées sont mis à jour en temps réel.

## Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Technologies utilisées](#technologies-utilisées)
- [Structure du projet](#structure-du-projet)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Lancement](#lancement)
- [API REST](#api-rest)
- [Événements temps réel](#événements-temps-réel)
- [Bases de données](#bases-de-données)
- [Sécurité](#sécurité)
- [Auteur](#auteur)

## Fonctionnalités

- Connexion avec l'email et le mot de passe du compte de l'université
- Session de 1 heure, vérifiée à chaque ouverture du mur, avec affichage de la date de dernière connexion
- Mur de publications avec pagination (bouton « Voir plus »)
- Création de publications : texte, hashtags (séparés par des espaces ou des virgules) et image par URL, avec aperçu
- Commentaires sur les publications
- Likes en temps réel (un clic pour aimer, un second pour retirer)
- Partage d'une publication, diffusé à tous les utilisateurs
- Liste des utilisateurs connectés, mise à jour en temps réel
- Tri des publications (date, auteur, popularité) et filtres (toutes ou les miennes, par hashtag)
- Bannières de notification pour les succès et les erreurs
- Déconnexion qui met à jour le statut de connexion de l'utilisateur

## Architecture

```
Navigateur (Angular)  <--- HTTPS + WebSocket --->  Serveur Node.js (Express + Socket.IO)
                                                        |                  |
                                                  PostgreSQL            MongoDB
                                             (comptes utilisateurs)  (publications, sessions)
```

Le serveur Node.js sert à la fois l'API, les WebSockets et l'application Angular compilée, sur le même port (3143) en HTTPS.

## Technologies utilisées

| Partie | Outils |
|---|---|
| Frontend | Angular 21, TypeScript, RxJS, Socket.IO client |
| Backend | Node.js, Express 5, Socket.IO, express-session |
| Bases de données | PostgreSQL (comptes), MongoDB (publications et sessions) |
| Qualité du code | Prettier, EditorConfig |

## Structure du projet

```
.
├── backend/
│   ├── monsevernode.js          # Serveur HTTPS, routes et fichiers du frontend
│   ├── db.js                    # Connexion PostgreSQL
│   ├── config/
│   │   ├── session.js           # Sessions stockées dans MongoDB
│   │   └── socket.js            # Événements temps réel (likes, partages, connectés)
│   ├── routes/
│   │   ├── auth.routes.js       # Connexion, session, déconnexion
│   │   └── posts.routes.js      # Publications et commentaires
│   └── .env.example             # Modèle de configuration
└── frontend/
    └── src/app/
        ├── pages/               # login, wall
        ├── components/          # create-post, post-item, notification-banner
        └── services/            # auth, posts, websocket
```

## Prérequis

- Node.js 20.19 ou supérieur (exigé par Angular 21)
- npm
- Un accès aux bases de données de l'université :
  - PostgreSQL, avec la table `fredouil.compte`
  - MongoDB, avec la base `db-CERI` et la collection `CERISoNet`
- Un certificat HTTPS (voir [Configuration](#configuration))

Le projet est configuré pour le serveur `pedago.univ-avignon.fr`. Sans accès à ces bases, l'application ne peut pas démarrer.

## Installation

```bash
git clone https://github.com/chaiebyassine/cerisonet-.git
cd cerisonet-

cd backend
npm install

cd ../frontend
npm install
```

## Configuration

### Variables d'environnement

Copiez le modèle, puis renseignez vos valeurs :

```bash
cd backend
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DB_HOST`, `DB_PORT` | Adresse et port de PostgreSQL |
| `DB_NAME` | Nom de la base PostgreSQL |
| `DB_USER`, `DB_PASSWORD` | Identifiants PostgreSQL |
| `MONGO_URI` | Adresse de connexion à MongoDB |
| `SESSION_COLLECTION` | Collection MongoDB des sessions (ex. `MySession3143`, avec le numéro de port) |
| `SESSION_SECRET` | Clé secrète qui signe le cookie de session |
| `NODE_ENV` | `development` ou `production` (optionnel) |

### Certificat HTTPS

Le serveur démarre en HTTPS et lit `backend/cert/key.pem` et `backend/cert/cert.pem`. Ces fichiers ne sont pas versionnés. Pour générer un certificat de test :

```bash
cd backend
mkdir -p cert
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout cert/key.pem -out cert/cert.pem -subj "/CN=localhost"
```

### Adresses du serveur

L'adresse `https://pedago.univ-avignon.fr:3143` est écrite dans les trois services du frontend (`frontend/src/app/services/*.ts`) et l'origine autorisée (CORS) dans `backend/monsevernode.js`. Pour exécuter le projet sur une autre machine, remplacez ces adresses.

## Lancement

1. Compiler le frontend :

```bash
cd frontend
npm run build
```

2. Démarrer le serveur :

```bash
cd backend
node monsevernode.js
```

L'application est disponible sur `https://pedago.univ-avignon.fr:3143` (page `/login`).

## API REST

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/login` | Connexion (email et mot de passe) |
| GET | `/api/session` | État de la session en cours |
| POST | `/api/logout` | Déconnexion |
| GET | `/api/posts?page=1&limit=5` | Liste paginée des publications |
| POST | `/api/posts` | Créer une publication (connexion requise) |
| POST | `/api/posts/:id/comment` | Ajouter un commentaire (connexion requise) |

## Événements temps réel

| Événement | Sens | Rôle |
|---|---|---|
| `userConnected` | client vers serveur | Annonce l'utilisateur connecté |
| `connectedUsers` | serveur vers clients | Liste à jour des utilisateurs connectés |
| `likePost` | client vers serveur | Aime ou retire son like |
| `postLiked` | serveur vers clients | Nouveaux likes d'une publication |
| `sharePost` | client vers serveur | Partage une publication |
| `postShared` | serveur vers clients | Nouvelle publication partagée |

## Bases de données

**PostgreSQL** : la table `fredouil.compte` contient les comptes (`id`, `mail`, `pseudo`, `nom`, `prenom`, `avatar`, `motpasse`, `statut_connexion`).

**MongoDB** : la collection `CERISoNet` de la base `db-CERI` contient les publications, avec les champs `body`, `createdBy`, `date`, `hour`, `hashtags`, `likes`, `comments`, `image`, `shared` et `sharedFrom`. Les sessions sont stockées dans la collection indiquée par `SESSION_COLLECTION`.

## Sécurité

- Requêtes SQL paramétrées contre les injections
- Cookie de session `httpOnly`, `secure` et limité à 1 heure
- Seules les URL d'image commençant par `http://` ou `https://` sont acceptées
- Les fichiers `.env`, les clés et les certificats sont exclus de Git (`.gitignore`)

## Auteur

**Yassine Chaieb** : [@chaiebyassine](https://github.com/chaiebyassine)
