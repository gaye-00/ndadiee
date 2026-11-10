package com.hautetech.ndadiee.authentication.password;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.hautetech.ndadiee.authentication.AuthenticationResponse;
import com.hautetech.ndadiee.authentication.AuthenticationService;
import com.hautetech.ndadiee.authentication.PendingVerificationResponse;
import com.hautetech.ndadiee.authentication.verification.AccountCodeService;
import com.hautetech.ndadiee.authentication.verification.AccountNoticeComposer;
import com.hautetech.ndadiee.authentication.verification.EmailVerificationService;
import com.hautetech.ndadiee.authentication.verification.VerificationMailComposer;
import com.hautetech.ndadiee.exception.AccountException;
import com.hautetech.ndadiee.exception.BusinessException;
import com.hautetech.ndadiee.exception.EmailVerificationException;
import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.EmailSender;
import com.hautetech.ndadiee.mail.MailConfiguration;
import com.hautetech.ndadiee.mail.MailQueue;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.AccountCode;
import com.hautetech.ndadiee.model.user.AccountCode.Purpose;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.AccountCodeRepository;
import com.hautetech.ndadiee.repository.UserRepository;

/**
 * Mot de passe oublié : un code part (sans rien dire des adresses inconnues), et avec lui on choisit un nouveau mot de
 * passe ; changer le sien demande l'actuel. Chaque fois, les autres sessions se ferment et un avis part.
 */
class PasswordServiceTest {

    private static final Pattern CODE = Pattern.compile("\\b(\\d{6})\\b");

    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private UserRepository users;
    private AccountCodeRepository codes;
    private EmailVerificationService emailVerificationService;
    private AuthenticationService authenticationService;
    private EmailSender emailSender;
    private PasswordService service;
    private Developer awa;
    private final AtomicReference<AccountCode> stored = new AtomicReference<>();

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        codes = mock(AccountCodeRepository.class);
        emailVerificationService = mock(EmailVerificationService.class);
        authenticationService = mock(AuthenticationService.class);
        emailSender = mock(EmailSender.class);
        // La file envoie tout de suite : le test lit les e-mails partis
        MailQueue queue = mock(MailQueue.class);
        doAnswer(invocation -> {
            ((Runnable) invocation.getArgument(0)).run();
            return null;
        }).when(queue).submit(any());
        // Le dépôt des codes garde le dernier code enregistré
        when(codes.save(any())).thenAnswer(invocation -> {
            stored.set(invocation.getArgument(0));
            return invocation.getArgument(0);
        });
        when(codes.findByUserIdAndPurpose(7L, Purpose.PASSWORD_RESET)).thenAnswer(invocation -> Optional.ofNullable(stored.get()));
        doAnswer(invocation -> {
            stored.set(null);
            return null;
        }).when(codes).delete(any());

        var messages = new MailConfiguration().mailMessages();
        AccountCodeService accountCodes = new AccountCodeService(codes, encoder, new VerificationMailComposer(messages), emailSender, queue);
        service = new PasswordService(users, accountCodes, emailVerificationService, authenticationService, encoder,
                new AccountNoticeComposer(messages, "https://ndadiee.com/"), emailSender, queue);

        awa = Developer.builder().username("awa").email("awa@example.com").fullName("Awa Diop")
                .password(encoder.encode("ancien-mot-de-passe")).preferredLanguage(Language.FR).build();
        awa.setId(7L);
        when(users.findByEmail("awa@example.com")).thenReturn(Optional.of(awa));
        when(users.findById(7L)).thenReturn(Optional.of(awa));
    }

    private List<EmailMessage> sentMails(int count) {
        ArgumentCaptor<EmailMessage> mail = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender, times(count)).send(mail.capture());
        return mail.getAllValues();
    }

    private String requestCode() {
        service.forgot(new ForgotPasswordRequest(" Awa@Example.com "));
        EmailMessage mail = sentMails(1).getFirst();
        assertThat(mail.to()).isEqualTo("awa@example.com");
        assertThat(mail.tag()).isEqualTo("auth.password-reset");
        Matcher matcher = CODE.matcher(mail.subject());
        assertThat(matcher.find()).isTrue();
        // Seule l'empreinte du code est gardée
        assertThat(stored.get().getCodeHash()).doesNotContain(matcher.group(1));
        return matcher.group(1);
    }

    @Test
    void anUnknownAddressGetsTheSameAnswerAndNoEmail() {
        when(users.findByEmail("personne@example.com")).thenReturn(Optional.empty());

        PendingVerificationResponse response = service.forgot(new ForgotPasswordRequest("personne@example.com"));

        assertThat(response.email()).isEqualTo("personne@example.com");
        assertThat(response.resendAvailableInSeconds()).isEqualTo(60);
        verify(emailSender, never()).send(any());
    }

    @Test
    void theCodeFromTheEmailSetsANewPasswordAndOpensASession() {
        String code = requestCode();
        AuthenticationResponse session = new AuthenticationResponse();
        when(authenticationService.openSession(awa)).thenReturn(session);

        AuthenticationResponse response = service.reset(new ResetPasswordRequest("awa@example.com", code, "nouveau-mot-de-passe"));

        assertThat(response).isSameAs(session);
        assertThat(encoder.matches("nouveau-mot-de-passe", awa.getPassword())).isTrue();
        assertThat(awa.isPasswordSet()).isTrue();
        // Les jetons émis avant ne valent plus rien
        assertThat(awa.getCredentialsChangedAt()).isNotNull();
        assertThat(awa.getCredentialsChangedAt().getNano()).isZero();
        // Le code a servi : il disparaît, et l'avis « mot de passe changé » part
        assertThat(stored.get()).isNull();
        EmailMessage notice = sentMails(2).get(1);
        assertThat(notice.tag()).isEqualTo("auth.password-changed");
        assertThat(notice.html()).contains("https://ndadiee.com/forgot-password");
    }

    @Test
    void aWrongCodeIsCountedAndChangesNothing() {
        String code = requestCode();
        String wrong = code.equals("000000") ? "111111" : "000000";
        String before = awa.getPassword();

        assertThatThrownBy(() -> service.reset(new ResetPasswordRequest("awa@example.com", wrong, "nouveau-mot-de-passe")))
                .isInstanceOf(EmailVerificationException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo("VERIFICATION_CODE_INVALID");
        assertThat(stored.get().getAttempts()).isEqualTo(1);
        assertThat(awa.getPassword()).isEqualTo(before);
        verify(authenticationService, never()).openSession(any());
    }

    @Test
    void theCodeAlsoConfirmsAPendingRegistration() {
        awa.setEmailVerified(false);
        String code = requestCode();

        service.reset(new ResetPasswordRequest("awa@example.com", code, "nouveau-mot-de-passe"));

        assertThat(awa.isEmailVerified()).isTrue();
        verify(emailVerificationService).discard(awa);
    }

    @Test
    void changingThePasswordNeedsTheCurrentOne() {
        assertThatThrownBy(() -> service.change(7L, new ChangePasswordRequest("pas-le-bon", "nouveau-mot-de-passe")))
                .isInstanceOf(AccountException.class)
                .satisfies(error -> {
                    assertThat(((BusinessException) error).getErrorCode()).isEqualTo("PASSWORD_INCORRECT");
                    assertThat(((BusinessException) error).getField()).isEqualTo("currentPassword");
                });
        verify(authenticationService, never()).buildResponse(any());
    }

    @Test
    void theNewPasswordMustDifferFromTheCurrentOne() {
        assertThatThrownBy(() -> service.change(7L, new ChangePasswordRequest("ancien-mot-de-passe", "ancien-mot-de-passe")))
                .isInstanceOf(AccountException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo("PASSWORD_UNCHANGED");
    }

    @Test
    void anAccountWithoutPasswordChoosesOneByEmailFirst() {
        awa.setPasswordSet(false);

        assertThatThrownBy(() -> service.change(7L, new ChangePasswordRequest("ancien-mot-de-passe", "nouveau-mot-de-passe")))
                .isInstanceOf(AccountException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo("PASSWORD_NOT_SET");
    }

    @Test
    void changingThePasswordClosesOtherSessionsAndRenewsThisOne() {
        AuthenticationResponse renewed = new AuthenticationResponse();
        when(authenticationService.buildResponse(awa)).thenReturn(renewed);

        AuthenticationResponse response = service.change(7L, new ChangePasswordRequest("ancien-mot-de-passe", "nouveau-mot-de-passe"));

        assertThat(response).isSameAs(renewed);
        assertThat(encoder.matches("nouveau-mot-de-passe", awa.getPassword())).isTrue();
        assertThat(awa.getCredentialsChangedAt()).isNotNull();
        assertThat(sentMails(1).getFirst().tag()).isEqualTo("auth.password-changed");
    }
}
