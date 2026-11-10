package com.hautetech.ndadiee.authentication.verification;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.exception.EmailVerificationException;
import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.EmailSender;
import com.hautetech.ndadiee.mail.MailQueue;
import com.hautetech.ndadiee.model.user.EmailVerification;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.repository.EmailVerificationRepository;
import com.hautetech.ndadiee.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Prouver son adresse e-mail : un code à 6 chiffres part par e-mail, et le compte ne s'ouvre qu'une fois ce code
 * saisi. Un code vaut 15 minutes et 5 essais ; un nouveau ne part pas avant une minute, ni plus de 10 fois par jour.
 * Les inscriptions jamais confirmées sont effacées au bout d'un jour : leur adresse et leur nom redeviennent libres.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class EmailVerificationService {

    static final Duration VALIDITY = OneTimeCodes.VALIDITY;
    public static final Duration RESEND_DELAY = OneTimeCodes.RESEND_DELAY;
    static final int MAX_ATTEMPTS = OneTimeCodes.MAX_ATTEMPTS;
    static final int MAX_SENDS_PER_DAY = OneTimeCodes.MAX_SENDS_PER_DAY;
    static final Duration UNCONFIRMED_RETENTION = Duration.ofDays(1);

    private final EmailVerificationRepository verifications;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final VerificationMailComposer composer;
    private final EmailSender emailSender;
    private final MailQueue mailQueue;

    /**
     * Envoie un nouveau code à l'adresse du compte, sauf si le précédent vient de partir (délai de renvoi) ou si le
     * plafond du jour est atteint : le code en cours reste alors valable.
     *
     * @return le nombre de secondes avant qu'un nouveau code puisse partir
     */
    public long send(User user) {
        EmailVerification verification = verifications.findByUserId(user.getId())
                .orElseGet(() -> EmailVerification.builder().user(user).build());
        OneTimeCodes.Issued issued = OneTimeCodes.issue(verification, passwordEncoder);
        if (!issued.sent()) {
            if (issued.capped()) {
                log.warn("[Auth] Plafond de codes du jour atteint - ID: {}", user.getId());
            }
            return issued.waitSeconds();
        }
        verifications.save(verification);

        EmailMessage message = composer.compose(user, issued.code(), VALIDITY);
        // Une fois l'inscription enregistrée : pas d'e-mail pour un compte que la transaction n'a finalement pas créé
        OneTimeCodes.afterCommit(() -> mailQueue.submit(() -> emailSender.send(message)));
        log.info("[Auth] Code de vérification envoyé - ID: {}", user.getId());
        return issued.waitSeconds();
    }

    /**
     * Le code saisi pour l'adresse d'un compte pas encore confirmé. Juste : l'adresse est prouvée, le code disparaît.
     * Un essai faux est compté même si la requête échoue (pas d'annulation pour ces refus).
     *
     * @return le compte, désormais confirmé
     * @throws EmailVerificationException code faux, expiré, ou trop d'essais ; ou aucune inscription en attente pour
     *                                    cette adresse (même réponse qu'un code faux : rien n'est dit sur l'adresse)
     */
    @Transactional(noRollbackFor = EmailVerificationException.class)
    public User verify(String email, String code) {
        User user = users.findByEmail(email).filter(candidate -> !candidate.isEmailVerified())
                .orElseThrow(() -> EmailVerificationException.invalidCode(MAX_ATTEMPTS));
        EmailVerification verification = verifications.findByUserId(user.getId())
                .orElseThrow(() -> EmailVerificationException.invalidCode(MAX_ATTEMPTS));
        OneTimeCodes.check(verification, code, passwordEncoder, wrong -> {
            verifications.save(wrong);
            log.info("[Auth] Code de vérification faux - ID: {} - essais restants : {}", user.getId(),
                    OneTimeCodes.remainingAttempts(wrong));
        });
        user.setEmailVerified(true);
        users.save(user);
        verifications.delete(verification);
        log.info("[Auth] Adresse e-mail confirmée - ID: {}", user.getId());
        return user;
    }

    /** Le code en attente d'un compte confirmé autrement (par GitHub ou Google) ne sert plus. */
    public void discard(User user) {
        verifications.deleteByUserId(user.getId());
    }

    /**
     * Le ménage : les inscriptions jamais confirmées, au-delà d'un jour. Personne ne s'y est jamais connecté ; leur
     * adresse et leur nom d'utilisateur redeviennent libres. Un compte qui ne peut pas partir (relié à autre chose)
     * reste, et sera retenté.
     */
    // Hors transaction : chaque compte part dans la sienne, un refus n'empêche pas les autres
    @Scheduled(initialDelayString = "PT15M", fixedDelayString = "PT1H")
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void purgeUnconfirmed() {
        List<Long> stale = users.findIdsOfUnconfirmedCreatedBefore(Instant.now().minus(UNCONFIRMED_RETENTION));
        for (Long id : stale) {
            try {
                verifications.deleteByUserId(id);
                users.deleteById(id);
                log.info("[Auth] Inscription jamais confirmée effacée - ID: {}", id);
            } catch (DataIntegrityViolationException e) {
                log.warn("[Auth] Inscription jamais confirmée gardée (encore référencée) - ID: {}", id);
            }
        }
    }
}
