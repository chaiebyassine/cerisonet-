
const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const connectionObj = require('../db'); 

// La base MongoDB 
const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB_NAME = 'db-CERI';
const POSTS_COLLECTION = 'CERISoNet';


// Récupérer les posts avec pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const client = new MongoClient(MONGO_URI);
    await client.connect();

    const postsCollection = client
      .db(MONGO_DB_NAME)
      .collection(POSTS_COLLECTION);

    const total = await postsCollection.countDocuments();

    const posts = await postsCollection
      .find({})
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    await client.close();

    
const userIds = [
  ...new Set(
    posts
      .map(p => parseInt(p.createdBy))
      .filter(id => !isNaN(id))
  )
];


let usersMap = {};

if (userIds.length > 0) {
  const result = await connectionObj.query(
    'SELECT id, pseudo, avatar FROM fredouil.compte WHERE id = ANY($1::int[])',
    [userIds]
  );

  result.rows.forEach(row => {
    usersMap[row.id] = row;
  });
}

const enrichedPosts = posts.map(p => ({
  // On garde toutes les données originales du post
  ...p,


  authorName:
    usersMap[parseInt(p.createdBy)]?.pseudo ||
    p.auteur ||
    `Utilisateur #${p.createdBy}`,


  authorAvatar:
    usersMap[parseInt(p.createdBy)]?.avatar ||
    null,

  
  comments: (p.comments || p.commentaires || []).map(c => ({
    ...c,

  
    auteur:
      c.auteur ||
      c.pseudo ||
      c.author ||
      c.username ||
      'Anonyme',

    texte:
      c.texte ||
      c.text ||
      c.body ||
      ''
  }))
}));
    res.json({
      ok: true,
      posts: enrichedPosts,
      total,
      page,
      hasMore: skip + posts.length < total
    });

  } catch (error) {
    console.error('Erreur récupération posts:', error);

    res.status(500).json({
      ok: false,
      message: 'Erreur lors de la récupération des posts'
    });
  }
});


// Créer un nouveau post
router.post('/', async (req, res) => {
  if (!req.session.isConnected) {
    return res.status(401).json({
      ok: false,
      message: 'Vous devez être connecté pour publier un post'
    });
  }

  const body = req.body.body?.trim();

  if (!body) {
    return res.status(400).json({
      ok: false,
      message: 'Le texte du post ne peut pas être vide'
    });
  }

  let client;

  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();

    const postsCollection = client
      .db(MONGO_DB_NAME)
      .collection(POSTS_COLLECTION);

    const now = new Date();

    // Accepte soit un tableau , soit une chaîne brute "#tag1 tag2, tag3"
    let hashtags = [];
    if (Array.isArray(req.body.hashtags)) {
      hashtags = req.body.hashtags.map(t => String(t).replace(/^#/, '').trim()).filter(t => t);
    } else if (typeof req.body.hashtagInput === 'string') {
      hashtags = req.body.hashtagInput.split(/[\s,]+/).map(t => t.replace(/^#/, '').trim()).filter(t => t);
    }

    // Validation de l'URL image : doit commencer par http
    let image = null;
    if (req.body.image?.url) {
      const urlStr = String(req.body.image.url).trim();
      if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
        image = { url: urlStr, title: String(req.body.image.title || '').trim() };
      } else {
        return res.status(400).json({ ok: false, message: 'URL image invalide (doit commencer par http:// ou https://)' });
      }
    }

    const newPost = {
      body,
      createdBy: req.session.user.id,
      date: now.toISOString().split('T')[0],
      hour: now.toTimeString().split(' ')[0],
      hashtags,
      likes: 0,
      comments: [],
      image,
      shared: false
    };

    const result = await postsCollection.insertOne(newPost);
    newPost._id = result.insertedId;

    const userResult = await connectionObj.query(
      'SELECT pseudo FROM fredouil.compte WHERE id = $1',
      [req.session.user.id]
    );

    newPost.authorName =
      userResult.rows[0]?.pseudo || `Utilisateur #${req.session.user.id}`;


    res.json({
      ok: true,
      message: 'Post publié avec succès',
      post: newPost
    });

  } catch (error) {
    console.error('Erreur création post:', error);

    res.status(500).json({
      ok: false,
      message: 'Erreur lors de la création du post'
    });

  } finally {
    if (client) {
      await client.close();
    }
  }
});


//  Ajouter un commentaire


router.post('/:id/comment', async (req, res) => {
  if (!req.session.isConnected) {
    return res.status(401).json({ ok: false, message: 'Non connecté' });
  }

  const { texte } = req.body;
  if (!texte || texte.trim() === '') {
    return res.status(400).json({ ok: false, message: 'Commentaire vide' });
  }

  try {
    const { ObjectId } = require('mongodb');
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(MONGO_DB_NAME);
    const postsCollection = db.collection(POSTS_COLLECTION);

    const comment = {
      auteur: req.session.user.pseudo,
      auteurId: req.session.user.id,
      texte: texte.trim(),
      date: new Date().toISOString()
    };

    const result = await postsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { comments: comment } }
    );

    await client.close();

    if (result.matchedCount === 0) {
      return res.status(404).json({ ok: false, message: 'Post non trouvé' });
    }

    res.json({ ok: true, comment });
  } catch (error) {
    console.error('Erreur ajout commentaire:', error);
    res.status(500).json({ ok: false, message: 'Erreur serveur' });
  }
});



module.exports = router;
