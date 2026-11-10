package com.hautetech.ndadiee.authentication.verification;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.authentication.verification.VerificationMailComposer.CodeMail;
import com.hautetech.ndadiee.exception.EmailVerificationException;
import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.EmailSender;
import com.hautetech.ndadiee.mail.MailQueue;
import com.hautetech.ndadiee.model.user.AccountCode;
import com.hautetech.ndadiee.model.user.AccountCode.Purpose;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.repository.AccountCodeRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Les codes envoyés par e-mail pour un geste sensible sur un compte ouvert : choisir un nouveau mot de passe, ou
 * confirmer la suppression d'un compte sans mot de passe. Mêmes règles que le code d'inscription (OneTimeCodes).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class AccountCodeService {

    private final AccountCodeRepository codes;
    private final PasswordEncoder passwordEncoder;
    private final VerificationMailComposer composer;
    private final EmailSender emailSender;
    private final MailQueue mailQueue;

    /**
     * Envoie un nouveau code pour ce geste, sauf si le précédent vient de partir ou si le plafond du jour est atteint :
     * le code en cours reste alors valable.
     *
     * @return le nombre de secondes avant qu'un nouveau code puisse partir
     */
    public long send(User user, Purpose purpose) {
        AccountCode code = codes.findByUserIdAndPurpose(user.getId(), purpose)
                .orElseGet(() -> AccountCode.builder().user(user).purpose(purpose).build());
        OneTimeCodes.Issued issued = OneTimeCodes.issue(code, passwordEncoder);
        if (!issued.sent()) {
            if (issued.capped()) {
                log.warn("[Auth] Plafond de codes du jour atteint ({}) - ID: {}", purpose, user.getId());
            }
            return issued.waitSeconds();
        }
        codes.save(code);

        EmailMessage message = composer.compose(user, issued.code(), OneTimeCodes.VALIDITY, mailOf(purpose));
        OneTimeCodes.afterCommit(() -> mailQueue.submit(() -> emailSender.send(message)));
        log.info("[Auth] Code envoyé ({}) - ID: {}", purpose, user.getId());
        return issued.waitSeconds();
    }

    /**
     * Le code saisi pour ce geste. Juste : il disparaît, le geste peut se faire. Un essai faux est compté même si la
     * requête échoue (l'appelant ne l'annule pas : noRollbackFor).
     *
     * @throws EmailVerificationException code faux, expiré, trop d'essais, ou aucun code demandé (même réponse qu'un
     *                                    code faux)
     */
    @Transactional(noRollbackFor = EmailVerificationException.class)
    public void consume(User user, Purpose purpose, String input) {
        AccountCode code = codes.findByUserIdAndPurpose(user.getId(), purpose)
                .orElseThrow(() -> EmailVerificationException.invalidCode(OneTimeCodes.MAX_ATTEMPTS));
        OneTimeCodes.check(code, input == null ? null : input.trim(), passwordEncoder, wrong -> {
            codes.save(wrong);
            log.info("[Auth] Code faux ({}) - ID: {} - essais restants : {}", purpose, user.getId(),
                    OneTimeCodes.remainingAttempts(wrong));
        });
        codes.delete(code);
    }

    private static CodeMail mailOf(Purpose purpose) {
        return switch (purpose) {
            case PASSWORD_RESET -> CodeMail.PASSWORD_RESET;
            case ACCOUNT_DELETION -> CodeMail.ACCOUNT_DELETION;
        };
    }
}
