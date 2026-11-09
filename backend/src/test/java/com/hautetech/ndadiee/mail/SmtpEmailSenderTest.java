package com.hautetech.ndadiee.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.util.Properties;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

/** Un e-mail part avec son expéditeur, son texte et son HTML, déclaré automatique ; un échec SMTP ne remonte pas. */
@ExtendWith(MockitoExtension.class)
class SmtpEmailSenderTest {

    @Mock
    private JavaMailSender mailSender;

    private SmtpEmailSender sender;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.lenient().when(mailSender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        sender = new SmtpEmailSender(mailSender, new MailProperties(true, "Ndadiee <no-reply@hautetech.org>"));
    }

    @Test
    void anEmailCarriesItsTextItsHtmlAndSaysItIsAutomatic() throws Exception {
        sender.send(new EmailMessage(1L, "ama@ndadiee.com", "[Lagos Transit] Chinedu a approuvé ta PR #84", "Texte", "<p>HTML</p>", "review.test"));

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(sent.capture());
        MimeMessage mime = sent.getValue();
        mime.saveChanges();
        assertThat(((InternetAddress) mime.getFrom()[0]).getAddress()).isEqualTo("no-reply@hautetech.org");
        assertThat(((InternetAddress) mime.getFrom()[0]).getPersonal()).isEqualTo("Ndadiee");
        assertThat(mime.getAllRecipients()).extracting(Object::toString).containsExactly("ama@ndadiee.com");
        assertThat(mime.getSubject()).isEqualTo("[Lagos Transit] Chinedu a approuvé ta PR #84");
        assertThat(mime.getHeader("Auto-Submitted")).containsExactly("auto-generated");
        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        mime.writeTo(raw);
        assertThat(raw.toString()).contains("text/plain", "text/html", "Texte", "<p>HTML</p>");
    }

    @Test
    void anSmtpFailureIsLoggedNotThrown() {
        doThrow(new MailSendException("Connexion refusée")).when(mailSender).send(any(MimeMessage.class));

        assertThatCode(() -> sender.send(new EmailMessage(1L, "ama@ndadiee.com", "Objet", "Texte", "<p>HTML</p>", "review.test")))
                .doesNotThrowAnyException();
    }

    @Test
    void demoAddressesOnReservedDomainsGetNothing() {
        sender.send(new EmailMessage(2L, "chinedu@example.com", "Objet", "Texte", "<p>HTML</p>", "review.test"));

        verify(mailSender, org.mockito.Mockito.never()).send(any(MimeMessage.class));
        assertThat(SmtpEmailSender.undeliverable("a@mail.example.org")).isTrue();
        assertThat(SmtpEmailSender.undeliverable("a@ndadiee.test")).isTrue();
        assertThat(SmtpEmailSender.undeliverable("a@gmail.com")).isFalse();
        assertThat(SmtpEmailSender.undeliverable("a@example.com.sn")).isFalse();
    }
}
