package com.hautetech.ndadiee.authentication.password;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.authentication.AuthenticationResponse;
import com.hautetech.ndadiee.authentication.AuthenticationService;
import com.hautetech.ndadiee.authentication.PendingVerificationResponse;
import com.hautetech.ndadiee.authentication.verification.AccountCodeService;
import com.hautetech.ndadiee.authentication.verification.AccountNoticeComposer;
import com.hautetech.ndadiee.authentication.verification.AccountNoticeComposer.Notice;
import com.hautetech.ndadiee.authentication.verification.EmailVerificationService;
import com.hautetech.ndadiee.authentication.verification.OneTimeCodes;
import com.hautetech.ndadiee.exception.AccountBlockedException;
import com.hautetech.ndadiee.exception.AccountException;
import com.hautetech.ndadiee.exception.EmailVerificationException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.EmailSender;
import com.hautetech.ndadiee.mail.MailQueue;
import com.hautetech.ndadiee.model.user.AccountCode.Purpose;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Le mot de passe d'un compte : oublié, il se remplace avec un code envoyé à l'adresse du compte ; connu, il se change
 * depuis les réglages. Dans les deux cas, les sessions ouvertes ailleurs se ferment (les jetons émis avant ne valent
 * plus rien) et un avis part à l'adresse du compte.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class PasswordService {

    private final UserRepository users;
    private final AccountCodeService accountCodes;
    private final EmailVerificationService emailVerificationService;
    private final AuthenticationService authenticationService;
    private final PasswordEncoder passwordEncoder;
    private final AccountNoticeComposer noticeComposer;
    private final EmailSender emailSender;
    private final MailQueue mailQueue;

    /**
     * Mot de passe oublié : un code part à l'adresse, si un compte l'utilise. La réponse est la même pour une adresse
     * inconnue : elle ne dit pas quelles adresses ont un compte.
     */
    public PendingVerificationResponse forgot(ForgotPasswordRequest request) {
        String email = normalize(request.getEmail());
        long wait = users.findByEmail(email)
                .filter(user -> !user.isDeleted())
                .map(user -> accountCodes.send(user, Purpose.PASSWORD_RESET))
                .orElse(OneTimeCodes.RESEND_DELAY.toSeconds());
        return new PendingVerificationResponse(email, wait);
    }

    /**
     * Le code reçu et le nouveau mot de passe : le mot de passe change, et la session s'ouvre. Le code prouve aussi
     * l'adresse : une inscription qui attendait le sien est confirmée. Un compte suspendu garde son nouveau mot de
     * passe, mais n'ouvre pas de session.
     *
     * @throws EmailVerificationException code faux, expiré ou trop essayé ; ou aucun code demandé pour cette adresse
     */
    @Transactional(noRollbackFor = { EmailVerificationException.class, AccountBlockedException.class })
    public AuthenticationResponse reset(ResetPasswordRequest request) {
        User user = users.findByEmail(normalize(request.getEmail()))
                .filter(found -> !found.isDeleted())
                .orElseThrow(() -> EmailVerificationException.invalidCode(OneTimeCodes.MAX_ATTEMPTS));
        accountCodes.consume(user, Purpose.PASSWORD_RESET, request.getCode());
        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            emailVerificationService.discard(user);
        }
        replacePassword(user, request.getPassword());
        log.info("[Auth] Mot de passe remplacé avec un code reçu par e-mail - ID: {}", user.getId());
        return authenticationService.openSession(user);
    }

    /**
     * Changer de mot de passe depuis ses réglages, en confirmant l'actuel. Les autres sessions se ferment ; celle-ci
     * reçoit une nouvelle paire de jetons.
     */
    public AuthenticationResponse change(Long userId, ChangePasswordRequest request) {
        User user = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Utilisateur", userId));
        if (!user.isPasswordSet()) {
            throw AccountException.noPassword();
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw AccountException.wrongPassword("currentPassword");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw AccountException.samePassword();
        }
        replacePassword(user, request.getNewPassword());
        log.info("[Auth] Mot de passe changé depuis les réglages - ID: {}", user.getId());
        return authenticationService.buildResponse(user);
    }

    private void replacePassword(User user, String password) {
        user.setPassword(passwordEncoder.encode(password));
        user.setPasswordSet(true);
        // À la seconde, comme la date d'émission des jetons : ceux émis à partir de maintenant restent valables
        user.setCredentialsChangedAt(Instant.now().truncatedTo(ChronoUnit.SECONDS));
        users.save(user);
        EmailMessage notice = noticeComposer.compose(user, Notice.PASSWORD_CHANGED, null);
        OneTimeCodes.afterCommit(() -> mailQueue.submit(() -> emailSender.send(notice)));
    }

    private static String normalize(String value) {
        return value.trim().toLowerCase();
    }
}
