package com.hautetech.ndadiee.authentication.verification;

import java.time.Duration;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.MailConfiguration;
import com.hautetech.ndadiee.mail.MailTemplate;
import com.hautetech.ndadiee.model.user.User;

/**
 * L'e-mail d'un code à 6 chiffres, dans la langue du membre : l'objet porte le code (il se lit dans la notification
 * du téléphone), le corps le répète en grand (templates/mail/code.html), avec sa durée de validité. Le texte dit à
 * quoi sert le code : confirmer son adresse, choisir un nouveau mot de passe, supprimer son compte.
 */
@Component
public class VerificationMailComposer {

    static final String TAG = "auth.verification";

    /** À quoi sert le code : ses textes (mail_*.properties) et sa nature dans le journal */
    public enum CodeMail {
        VERIFICATION("verification", TAG),
        PASSWORD_RESET("reset", "auth.password-reset"),
        ACCOUNT_DELETION("deletion", "auth.account-deletion");

        private final String prefix;
        private final String tag;

        CodeMail(String prefix, String tag) {
            this.prefix = prefix;
            this.tag = tag;
        }
    }

    private final MessageSource messages;
    private final MailTemplate template;

    public VerificationMailComposer(@Qualifier(MailConfiguration.MESSAGES) MessageSource messages) {
        this.messages = messages;
        this.template = MailTemplate.load("templates/mail/code.html");
    }

    /** Le code qui confirme l'adresse d'une inscription */
    public EmailMessage compose(User user, String code, Duration validity) {
        return compose(user, code, validity, CodeMail.VERIFICATION);
    }

    public EmailMessage compose(User user, String code, Duration validity, CodeMail kind) {
        Locale locale = MailTemplate.localeOf(user);
        Object[] args = { code, String.valueOf(validity.toMinutes()) };
        String subject = text(locale, kind.prefix + ".subject", args);
        String greeting = text(locale, "mail.greeting", MailTemplate.firstName(user.getFullName()));
        String headline = text(locale, kind.prefix + ".headline", args);
        String intro = text(locale, kind.prefix + ".intro", args);
        String validityLine = text(locale, kind.prefix + ".validity", args);
        String ignore = text(locale, kind.prefix + ".ignore", args);
        String brand = text(locale, "mail.brand");

        String html = template.fill(Map.ofEntries(
                Map.entry("lang", locale.getLanguage()),
                Map.entry("subject", MailTemplate.escape(subject)),
                Map.entry("preheader", MailTemplate.escape(intro)),
                Map.entry("greeting", MailTemplate.escape(greeting)),
                Map.entry("headline", MailTemplate.escape(headline)),
                Map.entry("intro", MailTemplate.escape(intro)),
                Map.entry("code", MailTemplate.escape(code)),
                Map.entry("validity", MailTemplate.escape(validityLine)),
                Map.entry("ignore", MailTemplate.escape(ignore)),
                Map.entry("brand", MailTemplate.escape(brand))));
        String plain = greeting + "\n\n" + headline + "\n\n" + intro + "\n\n    " + code + "\n\n" + validityLine + "\n\n"
                + ignore + "\n\n— " + brand + "\n";
        return new EmailMessage(user.getId(), user.getEmail(), subject, plain, html, kind.tag);
    }

    private String text(Locale locale, String code, Object... args) {
        return messages.getMessage(code, args, locale);
    }
}
