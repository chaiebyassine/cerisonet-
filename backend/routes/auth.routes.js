

const express = require('express');
const router = express.Router();
const crypto = require('crypto'); 

const connectionObj = require('../db'); 

// POST /api/login — Connexion d'un utilisateur

router.post('/login', (request, response) => {

  
  const hashedPassword = crypto.createHash('sha1').update(request.body.password).digest('hex');

  // Requête paramétrée ($1, $2) pour éviter les injections SQL
  const sql = "SELECT id, mail, pseudo, nom, prenom, avatar FROM fredouil.compte WHERE mail=$1 AND motpasse=$2 LIMIT 1";

  connectionObj.query(sql, [request.body.email, hashedPassword], (err, result) => {

    if(err){
      console.log("Erreur d'exécution de la requête : " + err.stack);
      return response.status(500).json({ ok:false, message:"Erreur PostgreSQL" });
    }

    if(result.rows[0] != null){
      
      request.session.isConnected = true;

      
      request.session.user = {
        id: result.rows[0].id,
        mail: result.rows[0].mail,
        pseudo: result.rows[0].pseudo
      };

      
      connectionObj.query(
        "UPDATE fredouil.compte SET statut_connexion = 1 WHERE id = $1",
        [result.rows[0].id]
      );

      return response.json({
        ok:true,
        message:"Connexion réussie",
        user: result.rows[0]
         });

    } else {
      // Email ou mot de passe incorrect — on renvoie 401 (non autorisé)
      return response.status(401).json({
        ok:false,
        message:"Connexion échouée : informations incorrectes"
      });

    }

  });

});



router.get('/session', (req, res) => {

  if(req.session.isConnected){
    res.json({ connected:true, user:req.session.user });
  } else {
    res.json({ connected:false });
  }

});

// POST /api/logout — Déconnexion


router.post('/logout', (req, res) => {
  if (req.session.isConnected && req.session.user) {
    const userId = req.session.user.id;
    connectionObj.query(
      "UPDATE fredouil.compte SET statut_connexion = 0 WHERE id = $1",
      [userId]
    );
  }
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ ok: false, message: "Erreur lors de la déconnexion" });
    }
    res.json({ ok: true, message: "Déconnexion réussie" });
  });
});

module.exports = router;