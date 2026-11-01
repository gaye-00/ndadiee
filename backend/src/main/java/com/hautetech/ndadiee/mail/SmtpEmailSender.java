package com.hautetech.ndadiee.mail;

import java.nio.charset.StandardCharsets;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

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
}
