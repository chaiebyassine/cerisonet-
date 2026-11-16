

const express = require('express'); // Framework web pour gérer les requêtes HTTP
const app = express();
app.use(express.json({ limit: '10mb' })); 

const cors = require('cors'); 

app.use(cors({
  origin: 'http://pedago.univ-avignon.fr:3143',
  credentials: true
}));

const https = require('https');
const fs = require('fs');
const path = require('path');


const options = {
     key: fs.readFileSync('cert/key.pem'),
     cert: fs.readFileSync('cert/cert.pem')
};


const sessionMiddleware = require('./config/session');
app.use(sessionMiddleware);

const authRoutes = require('./routes/auth.routes');
const postsRoutes = require('./routes/posts.routes');

app.use('/api', authRoutes);      
app.use('/api/posts', postsRoutes); 


const frontendPath = path.join(__dirname, '..', 'frontend', 'dist', 'frontend', 'browser');
app.use(express.static(frontendPath));


app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const server = https.createServer(options, app);

// On initialise Socket.io en lui passant le serveur HTTPS
const initSocket = require('./config/socket');
initSocket(server);

// Supprime les index composés problématiques sur la collection partagée.
// MongoDB interdit les index composés où deux champs sont tous les deux des tableaux
const { MongoClient } = require('mongodb');
async function dropBadIndexes() {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const col = client.db('db-CERI').collection('CERISoNet');
    const indexes = await col.indexes();
    for (const idx of indexes) {
      const keys = Object.keys(idx.key || {});
      if (keys.includes('likes') && keys.includes('hashtags')) {
        await col.dropIndex(idx.name);
        console.log(`Index supprimé : ${idx.name}`);
      }
    }
  } catch (e) {
    console.warn('dropBadIndexes:', e.message);
  } finally {
    await client.close();
  }
}

server.listen(3143, () => {
     console.log('Serveur HTTPS + WebSocket en écoute sur le port 3143');
     dropBadIndexes();
});

