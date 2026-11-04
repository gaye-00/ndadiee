package com.hautetech.ndadiee.mail;

/**
 * Envoie un e-mail : par SMTP en production (SmtpEmailSender), dans le journal ailleurs (LoggingEmailSender). Un
 * échec d'envoi est noté et ne remonte pas : un e-mail de notification n'annule jamais ce qui l'a provoqué.
 */
public interface EmailSender {

    void send(EmailMessage message);
}
