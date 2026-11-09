package com.hautetech.ndadiee.authentication.verification;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.MessageSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.MailConfiguration;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.User;

/**
 * L'e-mail du code de vérification, dans la langue du membre : l'objet porte le code (il se lit dans la notification
 * du téléphone), le corps le répète en grand (templates/mail/code.html), avec sa durée de validité.
 */
@Component
public class VerificationMailComposer {

    static final String TAG = "auth.verification";
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{(\\w+)}}");

    private final MessageSource messages;
    private final String template;

    public VerificationMailComposer(@Qualifier(MailConfiguration.MESSAGES) MessageSource messages) {
        this.messages = messages;
        this.template = read("templates/mail/code.html");
    }

    public EmailMessage compose(User user, String code, Duration validity) {
        Locale locale = user.getPreferredLanguage() == Language.EN ? Locale.ENGLISH : Locale.FRENCH;
        Object[] args = { code, String.valueOf(validity.toMinutes()) };
        String subject = text(locale, "verification.subject", args);
        String greeting = text(locale, "mail.greeting", firstName(user.getFullName()));
        String headline = text(locale, "verification.headline", args);
        String intro = text(locale, "verification.intro", args);
        String validityLine = text(locale, "verification.validity", args);
        String ignore = text(locale, "verification.ignore", args);
        String brand = text(locale, "mail.brand");

        String html = fill(Map.ofEntries(
                Map.entry("lang", locale.getLanguage()),
                Map.entry("subject", escape(subject)),
                Map.entry("preheader", escape(intro)),
                Map.entry("greeting", escape(greeting)),
                Map.entry("headline", escape(headline)),
                Map.entry("intro", escape(intro)),
                Map.entry("code", escape(code)),
                Map.entry("validity", escape(validityLine)),
                Map.entry("ignore", escape(ignore)),
                Map.entry("brand", escape(brand))));
        String plain = greeting + "\n\n" + headline + "\n\n" + intro + "\n\n    " + code + "\n\n" + validityLine + "\n\n"
                + ignore + "\n\n— " + brand + "\n";
        return new EmailMessage(user.getId(), user.getEmail(), subject, plain, html, TAG);
    }

    private String text(Locale locale, String code, Object... args) {
        return messages.getMessage(code, args, locale);
    }

    private static String firstName(String fullName) {
        String name = fullName == null ? "" : fullName.strip();
        int space = name.indexOf(' ');
        return space > 0 ? name.substring(0, space) : name;
    }

    // Remplace chaque {{clé}} du modèle, en une passe : une valeur qui contiendrait « {{ » n'est pas relue
    private String fill(Map<String, String> values) {
        Matcher matcher = PLACEHOLDER.matcher(template);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(out, Matcher.quoteReplacement(values.getOrDefault(matcher.group(1), "")));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    private static String escape(String value) {
        return HtmlUtils.htmlEscape(value, StandardCharsets.UTF_8.name());
    }

    private static String read(String path) {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Modèle d'e-mail introuvable : " + path, e);
        }
    }
}
