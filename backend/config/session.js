// config/session.js — Configuration des sessions utilisateur
// Une session, c'est ce qui permet au serveur de "se souvenir" qu'un utilisateur est connecté
// entre chaque requête HTTP. Sans session, il faudrait se reconnecter à chaque clic.

require('dotenv').config();

const session = require('express-session');


// On utilise connect-mongodb-session pour les stocker dans MongoDB à la place.
const MongoDBStore = require('connect-mongodb-session')(session);

// Le store MongoDB : les sessions seront sauvegardées dans la collection
// définie par SESSION_COLLECTION dans le fichier .env
const store = new MongoDBStore({
  uri: process.env.MONGO_URI,
  collection: process.env.SESSION_COLLECTION
});

store.on('error', function(error) {
  console.log("Erreur MongoDBSession :", error);
});

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET, // Clé secrète pour signer le cookie 
  resave: false,           // Ne pas re-sauvegarder la session si rien n'a changé 
  saveUninitialized: false, // Ne pas créer une session pour les visiteurs non connectés
  store: store,
  cookie: {
    secure: true,        // Le cookie ne voyage que sur HTTPS — obligatoire ici car on est en HTTPS
    httpOnly: true,      // JavaScript côté client ne peut pas lire ce cookie (protection contre le vol de session)
    sameSite: 'none',    // Indispensable : Angular tourne sur :3142 et le backend sur :3143, ce sont deux origines différentes
    maxAge: 1000 * 60 * 60 // Durée de vie de la session : 1 heure (exprimée en millisecondes)
  }
});

module.exports = sessionMiddleware;