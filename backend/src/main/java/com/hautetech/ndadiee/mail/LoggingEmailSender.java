package com.hautetech.ndadiee.mail;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * Hors production, aucun e-mail ne part : on note seulement celui qui serait parti, son objet et son destinataire
 * (par son identifiant). Les comptes de démonstration ne reçoivent donc jamais rien.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "ndadiee.mail", name = "enabled", havingValue = "false", matchIfMissing = true)
public class LoggingEmailSender implements EmailSender {

    @Override
    public void send(EmailMessage message) {
        log.info("[Mail] Envoi coupé hors production : {} « {} » pour le membre {}", message.tag(), message.subject(),
                message.recipientId());
    }
}
