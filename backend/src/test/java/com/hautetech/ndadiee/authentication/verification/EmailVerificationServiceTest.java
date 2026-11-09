package com.hautetech.ndadiee.authentication.verification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.hautetech.ndadiee.exception.EmailVerificationException;
import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.EmailSender;
import com.hautetech.ndadiee.mail.MailConfiguration;
import com.hautetech.ndadiee.mail.MailQueue;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.EmailVerification;
import com.hautetech.ndadiee.repository.EmailVerificationRepository;
import com.hautetech.ndadiee.repository.UserRepository;

/**
 * Le code à 6 chiffres : il part par e-mail (jamais enregistré en clair), vaut 15 minutes et 5 essais, ne repart pas
 * avant une minute ni plus de 10 fois par jour ; juste, il confirme l'adresse et disparaît.
 */
class EmailVerificationServiceTest {

    private static final Pattern CODE = Pattern.compile("\\b(\\d{6})\\b");

    private EmailVerificationRepository verifications;
    private UserRepository users;
    private EmailSender emailSender;
    private EmailVerificationService service;
    private Developer awa;

    @BeforeEach
    void setUp() {
        verifications = mock(EmailVerificationRepository.class);
        users = mock(UserRepository.class);
        emailSender = mock(EmailSender.class);
        // La file envoie tout de suite : le test lit l'e-mail parti
        MailQueue queue = mock(MailQueue.class);
        org.mockito.Mockito.doAnswer(invocation -> {
            ((Runnable) invocation.getArgument(0)).run();
            return null;
        }).when(queue).submit(any());
        ResourceBundleMessageSource messages = new MailConfiguration().mailMessages();
        service = new EmailVerificationService(verifications, users, new BCryptPasswordEncoder(4),
                new VerificationMailComposer(messages), emailSender, queue);
        awa = Developer.builder().username("awa").email("awa@example.com").fullName("Awa Diop")
                .preferredLanguage(Language.FR).emailVerified(false).build();
        awa.setId(7L);
    }

    /** Envoie un code et le rend, tel que lu dans l'e-mail parti */
    private String sendAndReadCode() {
        when(verifications.findByUserId(7L)).thenReturn(Optional.empty());
        service.send(awa);
        ArgumentCaptor<EmailMessage> mail = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender).send(mail.capture());
        Matcher matcher = CODE.matcher(mail.getValue().subject());
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private EmailVerification saved() {
        ArgumentCaptor<EmailVerification> saved = ArgumentCaptor.forClass(EmailVerification.class);
        verify(verifications, org.mockito.Mockito.atLeastOnce()).save(saved.capture());
        return saved.getValue();
    }

    @Test
    void theCodeLeavesByEmailAndOnlyItsHashIsKept() {
        String code = sendAndReadCode();
        EmailVerification verification = saved();

        assertThat(verification.getCodeHash()).doesNotContain(code).startsWith("$2");
        assertThat(verification.getExpiresAt()).isBetween(Instant.now().plus(Duration.ofMinutes(14)), Instant.now().plus(Duration.ofMinutes(16)));
        ArgumentCaptor<EmailMessage> mail = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender).send(mail.capture());
        assertThat(mail.getValue().to()).isEqualTo("awa@example.com");
        assertThat(mail.getValue().subject()).isEqualTo(code + " est ton code Ndadiee");
        assertThat(mail.getValue().html()).contains(code).contains("15 minutes").contains("Bonjour Awa");
        assertThat(mail.getValue().text()).contains(code);
    }

    @Test
    void aNewCodeDoesNotLeaveBeforeTheResendDelay() {
        EmailVerification recent = EmailVerification.builder().user(awa).codeHash("x").expiresAt(Instant.now().plusSeconds(800))
                .sentAt(Instant.now().minusSeconds(20)).windowStartedAt(Instant.now().minusSeconds(20)).sendCount(1).build();
        when(verifications.findByUserId(7L)).thenReturn(Optional.of(recent));

        long wait = service.send(awa);

        assertThat(wait).isBetween(39L, 41L);
        verify(emailSender, never()).send(any());
        verify(verifications, never()).save(any());
    }

    @Test
    void noMoreThanTenCodesADay() {
        EmailVerification busy = EmailVerification.builder().user(awa).codeHash("x").expiresAt(Instant.now())
                .sentAt(Instant.now().minusSeconds(120)).windowStartedAt(Instant.now().minus(Duration.ofHours(2))).sendCount(10).build();
        when(verifications.findByUserId(7L)).thenReturn(Optional.of(busy));

        assertThat(service.send(awa)).isGreaterThan(Duration.ofHours(21).toSeconds());
        verify(emailSender, never()).send(any());
    }

    @Test
    void theRightCodeConfirmsTheAddressAndDisappears() {
        String code = sendAndReadCode();
        EmailVerification verification = saved();
        when(users.findByEmail("awa@example.com")).thenReturn(Optional.of(awa));
        when(verifications.findByUserId(7L)).thenReturn(Optional.of(verification));

        assertThat(service.verify("awa@example.com", code)).isSameAs(awa);
        assertThat(awa.isEmailVerified()).isTrue();
        verify(verifications).delete(verification);
    }

    @Test
    void aWrongCodeCountsAndTheFifthLocksTheCode() {
        String code = sendAndReadCode();
        EmailVerification verification = saved();
        when(users.findByEmail("awa@example.com")).thenReturn(Optional.of(awa));
        when(verifications.findByUserId(7L)).thenReturn(Optional.of(verification));
        String wrong = code.equals("000000") ? "111111" : "000000";

        assertThatThrownBy(() -> service.verify("awa@example.com", wrong))
                .isInstanceOf(EmailVerificationException.class)
                .extracting(error -> ((EmailVerificationException) error).getDetails().get("remainingAttempts"))
                .isEqualTo("4");
        for (int i = 0; i < 3; i++) {
            assertThatThrownBy(() -> service.verify("awa@example.com", wrong)).isInstanceOf(EmailVerificationException.class);
        }
        assertThatThrownBy(() -> service.verify("awa@example.com", wrong))
                .extracting("errorCode").isEqualTo("VERIFICATION_TOO_MANY_ATTEMPTS");
        // Même le bon code ne passe plus : il faut en demander un autre
        assertThatThrownBy(() -> service.verify("awa@example.com", code))
                .extracting("errorCode").isEqualTo("VERIFICATION_TOO_MANY_ATTEMPTS");
        assertThat(awa.isEmailVerified()).isFalse();
    }

    @Test
    void anExpiredCodeNoLongerWorks() {
        String code = sendAndReadCode();
        EmailVerification verification = saved();
        verification.setExpiresAt(Instant.now().minusSeconds(1));
        when(users.findByEmail("awa@example.com")).thenReturn(Optional.of(awa));
        when(verifications.findByUserId(7L)).thenReturn(Optional.of(verification));

        assertThatThrownBy(() -> service.verify("awa@example.com", code))
                .extracting("errorCode").isEqualTo("VERIFICATION_CODE_EXPIRED");
        assertThat(awa.isEmailVerified()).isFalse();
    }

    @Test
    void anUnknownOrConfirmedAddressLooksLikeAWrongCode() {
        when(users.findByEmail("inconnu@example.com")).thenReturn(Optional.empty());
        Developer confirmed = Developer.builder().username("kofi").email("kofi@example.com").build();
        when(users.findByEmail("kofi@example.com")).thenReturn(Optional.of(confirmed));

        assertThatThrownBy(() -> service.verify("inconnu@example.com", "123456")).extracting("errorCode").isEqualTo("VERIFICATION_CODE_INVALID");
        assertThatThrownBy(() -> service.verify("kofi@example.com", "123456")).extracting("errorCode").isEqualTo("VERIFICATION_CODE_INVALID");
    }

    @Test
    void anEnglishSpeakerGetsTheEmailInEnglish() {
        awa.setPreferredLanguage(Language.EN);
        String code = sendAndReadCode();
        ArgumentCaptor<EmailMessage> mail = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender).send(mail.capture());
        assertThat(mail.getValue().subject()).isEqualTo(code + " is your Ndadiee code");
        assertThat(mail.getValue().html()).contains("Hi Awa").contains("lang=\"en\"");
    }
}
