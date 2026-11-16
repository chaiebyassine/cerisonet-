
// C'est utilisé ici pour : afficher les likes en temps réel et la liste des connectés.

const { Server } = require('socket.io');
const { MongoClient, ObjectId } = require('mongodb');

// Dictionnaire qui garde en mémoire les utilisateurs connectés.
// Clé = socketId (identifiant unique par onglet/connexion), Valeur = { id, pseudo }
// Quand un utilisateur ferme son onglet, on supprime son entrée.
const connectedUsers = {};

function initSocket(server) {
  // On attache Socket.io 
  const io = new Server(server, {
    cors: {
      origin: '*',
      credentials: true
    } 
  });

  // Ce callback se déclenche à chaque fois qu'un navigateur ouvre une connexion WebSocket
  io.on('connection', (socket) => {
    console.log('Socket connecté:', socket.id);

    
    // Ça permet d'associer le socketId à un vrai utilisateur 
    socket.on('userConnected', (userData) => {
      connectedUsers[socket.id] = { id: userData.id,  pseudo: userData.pseudo };
      // On diffuse la liste mise à jour à TOUS les clients connectés
      io.emit('connectedUsers', Object.values(connectedUsers));
    });

    // Événement déclenché quand un utilisateur clique sur le bouton like/unlike
    socket.on('likePost', async (data) => {
      try {
        const client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        const db = client.db('db-CERI');
        const col = db.collection('CERISoNet');

        const post = await col.findOne({ _id: new ObjectId(data.postId) });
        if (!post) { await client.close(); return; }

        const userId = data.userId;
        let newLikes;

        if (Array.isArray(post.likes)) {
          // Format tableau : toggle like/unlike
          const alreadyLiked = post.likes.some(id => String(id) === String(userId));
          if (alreadyLiked) {
            newLikes = post.likes.filter(id => String(id) !== String(userId));
          } else {
            newLikes = [...post.likes, userId];
          }
        } else {
          
          const currentCount = typeof post.likes === 'number' ? post.likes : 0;
          const fakeArray = Array.from({ length: currentCount }, (_, i) => 'legacy_' + i);
          newLikes = [...fakeArray, userId];
        }

        // On sauvegarde le nouveau tableau de likes dans MongoDB
        await col.updateOne(
          { _id: new ObjectId(data.postId) },
          { $set: { likes: newLikes } }
        );
        await client.close();

        // On diffuse le résultat à tous les clients connectés
        io.emit('postLiked', { postId: data.postId, likes: newLikes });
      } catch (err) {
        console.error('Erreur likePost:', err);
      }
    });

    // Partager un post : crée une copie dans MongoDB et diffuse à tous
    socket.on('sharePost', async (data) => {
      try {
        const client = new MongoClient(process.env.MONGO_URI);
        await client.connect();
        const db = client.db('db-CERI');
        const col = db.collection('CERISoNet');

        let postQuery;
        try {
          postQuery = { _id: new ObjectId(data.postId) };
        } catch (e) {
          postQuery = { _id: data.postId };
        }

        const originalPost = await col.findOne(postQuery);
        if (!originalPost) {
          socket.emit('shareError', { message: 'Post introuvable' });
          await client.close();
          return;
        }

        const now = new Date();
        const sharedPost = {
          body: originalPost.body || originalPost.texte || '',
          createdBy: data.userId,
          authorName: data.pseudo,
          date: now.toISOString().split('T')[0],
          hour: now.toTimeString().split(' ')[0],
          hashtags: originalPost.hashtags || [],
          likes: 0,
          comments: [],
          image: originalPost.image || null,
          shared: true,
          sharedFrom: { 
            originalId: originalPost._id.toString(),
            originalCreatedBy: originalPost.createdBy || null
          }
        };

        const result = await col.insertOne(sharedPost);
        sharedPost._id = result.insertedId.toString();
        await client.close();

        // Diffuse le nouveau post partagé à tous les clients
        io.emit('postShared', sharedPost);
      } catch (err) {
        console.error('Erreur sharePost:', err);
        socket.emit('shareError', { message: 'Erreur lors du partage' });
      }
    });

    // Quand l'utilisateur ferme son onglet ou se déconnecte, Socket.io émet automatiquement 'disconnect'
    socket.on('disconnect', () => {
      delete connectedUsers[socket.id]; // on l'enlève de la liste des connectés
      io.emit('connectedUsers', Object.values(connectedUsers)); // on met à jour tous les clients
      console.log('Socket déconnecté:', socket.id);
    });
  });

  return io;
}

module.exports = initSocket;
