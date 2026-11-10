package com.hautetech.ndadiee.mail;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.common.ReservedDomains;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Les e-mails partent par le serveur SMTP (spring.mail, profil prod). Chaque e-mail porte son texte et son HTML, et
 * se déclare automatique : les répondeurs (« absent du bureau ») ne répondent pas à no-reply.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "ndadiee.mail", name = "enabled", havingValue = "true")
public class SmtpEmailSender implements EmailSender {

    private final JavaMailSender mailSender;
    private final MailProperties properties;

    @Override
    public void send(EmailMessage message) {
        if (undeliverable(message.to())) {
            log.info("[Mail] {} non envoyé au membre {} : adresse de démonstration (domaine réservé)", message.tag(),
                    message.recipientId());
            return;
        }
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name());
            helper.setFrom(properties.from());
            helper.setTo(message.to());
            helper.setSubject(message.subject());
            helper.setText(message.text(), message.html());
            mime.setHeader("Auto-Submitted", "auto-generated");
            mime.setHeader("X-Auto-Response-Suppress", "All");
            mailSender.send(mime);
            log.info("[Mail] {} envoyé au membre {}", message.tag(), message.recipientId());
        } catch (MessagingException | MailException e) {
            log.warn("[Mail] {} non envoyé au membre {} : {}", message.tag(), message.recipientId(), e.getMessage());
        }
    }

    // Domaine réservé (ReservedDomains) : aucun e-mail n'y arrive, et les comptes de démonstration s'en servent. Y envoyer
    // ne produirait que des rebonds, qui nuisent à la réputation de l'expéditeur (et à l'arrivée des vrais codes)
    static boolean undeliverable(String address) {
        String domain = address == null ? "" : address.substring(address.lastIndexOf('@') + 1).strip().toLowerCase(Locale.ROOT);
        return domain.isEmpty() || ReservedDomains.isReserved(domain);
    }
}
