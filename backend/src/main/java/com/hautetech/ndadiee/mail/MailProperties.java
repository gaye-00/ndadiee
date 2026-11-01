package com.hautetech.ndadiee.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Les e-mails de notification (ndadiee.mail).
 *
 * @param enabled envoyés par SMTP (profil prod, application-prod.yaml) ; sinon seulement notés dans le journal
 * @param from    l'expéditeur, « Ndadiee &lt;no-reply@hautetech.org&gt; » : l'adresse du compte SMTP
 */
@ConfigurationProperties(prefix = "ndadiee.mail")
public record MailProperties(boolean enabled, String from) {

    public MailProperties {
        from = from == null || from.isBlank() ? "Ndadiee <no-reply@hautetech.org>" : from.strip();
    }
}
