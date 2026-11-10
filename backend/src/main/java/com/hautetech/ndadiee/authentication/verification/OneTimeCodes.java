package com.hautetech.ndadiee.authentication.verification;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.function.Consumer;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.hautetech.ndadiee.exception.EmailVerificationException;
import com.hautetech.ndadiee.model.user.OneTimeCode;

/**
 * Les règles communes des codes à 6 chiffres envoyés par e-mail (adresse à confirmer, mot de passe oublié, suppression
 * de compte) : un code vaut 15 minutes et 5 essais ; un nouveau ne part pas avant une minute, ni plus de 10 fois par
 * jour. Seule l'empreinte BCrypt du code est gardée.
 */
public final class OneTimeCodes {

    public static final Duration VALIDITY = Duration.ofMinutes(15);
    public static final Duration RESEND_DELAY = Duration.ofSeconds(60);
    public static final int MAX_ATTEMPTS = 5;
    public static final int MAX_SENDS_PER_DAY = 10;
    private static final Duration DAY = Duration.ofDays(1);
    private static final SecureRandom RANDOM = new SecureRandom();

    private OneTimeCodes() {
    }

    /**
     * Le résultat d'une demande de code.
     *
     * @param code        le code à envoyer, ou null s'il n'en part pas (délai de renvoi, plafond du jour)
     * @param waitSeconds le nombre de secondes avant qu'un nouveau code puisse partir
     * @param capped      vrai si le plafond du jour est atteint
     */
    public record Issued(String code, long waitSeconds, boolean capped) {

        public boolean sent() {
            return code != null;
        }
    }

    /**
     * Tire un nouveau code dans cette ligne (neuve, ou celle du code précédent), sauf si le précédent vient de partir
     * ou si le plafond du jour est atteint : le code en cours reste alors valable. Ne sauvegarde rien.
     */
    public static Issued issue(OneTimeCode target, PasswordEncoder encoder) {
        Instant now = Instant.now();
        if (target.getWindowStartedAt() == null) {
            target.setWindowStartedAt(now);
        }
        if (target.getSentAt() != null) {
            Instant nextSend = target.getSentAt().plus(RESEND_DELAY);
            if (now.isBefore(nextSend)) {
                return new Issued(null, secondsBetween(now, nextSend), false);
            }
            if (!now.isBefore(target.getWindowStartedAt().plus(DAY))) {
                target.setWindowStartedAt(now);
                target.setSendCount(0);
            }
            if (target.getSendCount() >= MAX_SENDS_PER_DAY) {
                return new Issued(null, secondsBetween(now, target.getWindowStartedAt().plus(DAY)), true);
            }
        }

        String code = "%06d".formatted(RANDOM.nextInt(1_000_000));
        target.setCodeHash(encoder.encode(code));
        target.setExpiresAt(now.plus(VALIDITY));
        target.setAttempts(0);
        target.setSentAt(now);
        target.setSendCount(target.getSendCount() + 1);
        return new Issued(code, RESEND_DELAY.toSeconds(), false);
    }

    /**
     * Vérifie le code saisi. Faux, l'essai est compté et confié à {@code recordAttempt} (qui le sauvegarde) avant le
     * refus : la requête qui échoue ne doit pas l'annuler.
     *
     * @throws EmailVerificationException code faux, expiré, ou trop d'essais
     */
    public static <T extends OneTimeCode> void check(T target, String code, PasswordEncoder encoder, Consumer<T> recordAttempt) {
        if (target.getAttempts() >= MAX_ATTEMPTS) {
            throw EmailVerificationException.tooManyAttempts();
        }
        if (Instant.now().isAfter(target.getExpiresAt())) {
            throw EmailVerificationException.expired();
        }
        if (code == null || !encoder.matches(code, target.getCodeHash())) {
            target.setAttempts(target.getAttempts() + 1);
            recordAttempt.accept(target);
            int remaining = MAX_ATTEMPTS - target.getAttempts();
            throw remaining <= 0 ? EmailVerificationException.tooManyAttempts() : EmailVerificationException.invalidCode(remaining);
        }
    }

    /** Les essais qui restent sur ce code */
    public static int remainingAttempts(OneTimeCode target) {
        return Math.max(0, MAX_ATTEMPTS - target.getAttempts());
    }

    /** Une fois la transaction validée (un e-mail ne part pas pour un code que la transaction n'a pas gardé) */
    public static void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }

    private static long secondsBetween(Instant from, Instant to) {
        return Math.max(1, (Duration.between(from, to).toMillis() + 999) / 1000);
    }
}
