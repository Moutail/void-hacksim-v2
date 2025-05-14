// utils/email.js - Utilitaires pour l'envoi d'emails
const nodemailer = require('nodemailer');

// Configuration du transporteur d'emails
let transporter;

// Initialisation du transporteur
const initTransporter = () => {
  // Vérifier si le transporteur est déjà initialisé
  if (transporter) return;
  
  // Créer le transporteur
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Envoie un email
 * @param {Object} options - Options d'email
 * @param {string} options.to - Adresse email du destinataire
 * @param {string} options.subject - Sujet de l'email
 * @param {string} options.text - Contenu texte de l'email
 * @param {string} options.html - Contenu HTML de l'email (optionnel)
 * @param {string} options.from - Adresse email de l'expéditeur (optionnel)
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
const sendEmail = async (options) => {
  // Initialiser le transporteur si ce n'est pas déjà fait
  initTransporter();
  
  // Préparer l'email
  const mailOptions = {
    from: options.from || `VOID HackSimulator <${process.env.EMAIL_FROM}>`,
    to: options.to,
    subject: options.subject,
    text: options.text
  };
  
  // Ajouter le contenu HTML si fourni
  if (options.html) {
    mailOptions.html = options.html;
  }
  
  // Envoyer l'email
  return await transporter.sendMail(mailOptions);
};

/**
 * Envoie un email de bienvenue à un nouvel utilisateur
 * @param {Object} user - Utilisateur
 * @param {string} user.email - Email de l'utilisateur
 * @param {string} user.username - Nom d'utilisateur
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
const sendWelcomeEmail = async (user) => {
  const subject = 'Bienvenue sur VOID HackSimulator !';
  const text = `Bonjour ${user.username},
  
Merci de vous être inscrit sur VOID HackSimulator. Nous sommes ravis de vous compter parmi notre communauté de hackers éthiques.

Commencez dès maintenant à explorer les défis et à améliorer vos compétences. N'hésitez pas à participer aux discussions sur notre forum.

À bientôt sur VOID HackSimulator !

L'équipe VOID Security
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #000; color: #0f0; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bienvenue sur VOID HackSimulator !</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${user.username}</strong>,</p>
      <p>Merci de vous être inscrit sur VOID HackSimulator. Nous sommes ravis de vous compter parmi notre communauté de hackers éthiques.</p>
      <p>Commencez dès maintenant à explorer les défis et à améliorer vos compétences. N'hésitez pas à participer aux discussions sur notre forum.</p>
      <p>À bientôt sur VOID HackSimulator !</p>
      <p><em>L'équipe VOID Security</em></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>
`;

  return await sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
};

/**
 * Envoie un email de notification pour un nouveau défi
 * @param {Object} user - Utilisateur
 * @param {Object} challenge - Défi
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
const sendNewChallengeEmail = async (user, challenge) => {
  const subject = `Nouveau défi disponible : ${challenge.title}`;
  const text = `Bonjour ${user.username},
  
Un nouveau défi vient d'être ajouté sur VOID HackSimulator !

${challenge.title} - ${challenge.level} (${challenge.points} points)
${challenge.description}

Connectez-vous dès maintenant pour relever ce défi :
https://votre-site.com/challenges/${challenge._id}

Bonne chance !

L'équipe VOID Security
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #000; color: #0f0; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .challenge { background-color: #f0f0f0; border-left: 4px solid #0f0; padding: 15px; margin: 15px 0; }
    .challenge h2 { margin-top: 0; color: #333; }
    .challenge .meta { color: #666; font-size: 14px; }
    .challenge .points { font-weight: bold; color: #0f0; }
    .button { display: inline-block; background-color: #0f0; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nouveau défi disponible !</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${user.username}</strong>,</p>
      <p>Un nouveau défi vient d'être ajouté sur VOID HackSimulator !</p>
      
      <div class="challenge">
        <h2>${challenge.title}</h2>
        <p class="meta">Niveau: ${challenge.level} | <span class="points">${challenge.points} points</span></p>
        <p>${challenge.description}</p>
      </div>
      
      <p>Connectez-vous dès maintenant pour relever ce défi :</p>
      <p style="text-align: center;">
        <a href="https://votre-site.com/challenges/${challenge._id}" class="button">Voir le défi</a>
      </p>
      
      <p>Bonne chance !</p>
      <p><em>L'équipe VOID Security</em></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>
`;

  return await sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
};

/**
 * Envoie un email d'annonce importante
 * @param {Object} user - Utilisateur
 * @param {string} title - Titre de l'annonce
 * @param {string} content - Contenu de l'annonce
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
const sendAnnouncementEmail = async (user, title, content) => {
  const subject = `VOID HackSimulator - Annonce : ${title}`;
  const text = `Bonjour ${user.username},
  
${content}

Connectez-vous pour plus d'informations :
https://votre-site.com/announcements

L'équipe VOID Security
`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #000; color: #0f0; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .announcement { background-color: #f0f0f0; border-left: 4px solid #ff9800; padding: 15px; margin: 15px 0; }
    .button { display: inline-block; background-color: #0f0; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Annonce importante</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${user.username}</strong>,</p>
      
      <div class="announcement">
        <h2>${title}</h2>
        <p>${content.replace(/\n/g, '<br>')}</p>
      </div>
      
      <p>Connectez-vous pour plus d'informations :</p>
      <p style="text-align: center;">
        <a href="https://votre-site.com/announcements" class="button">Voir les annonces</a>
      </p>
      
      <p><em>L'équipe VOID Security</em></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>
`;

  return await sendEmail({
    to: user.email,
    subject,
    text,
    html
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendNewChallengeEmail,
  sendAnnouncementEmail
};