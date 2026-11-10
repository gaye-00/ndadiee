package com.hautetech.ndadiee.mail;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.core.io.ClassPathResource;
import org.springframework.web.util.HtmlUtils;

import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.User;

/**
 * Un modèle d'e-mail HTML (templates/mail) et ses {{clés}}, remplies en une passe : une valeur qui contiendrait « {{ »
 * n'est pas relue. Les valeurs arrivent déjà échappées ({@link #escape}).
 */
public final class MailTemplate {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{(\\w+)}}");

    private final String template;

    private MailTemplate(String template) {
        this.template = template;
    }

    public static MailTemplate load(String path) {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return new MailTemplate(new String(in.readAllBytes(), StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException("Modèle d'e-mail introuvable : " + path, e);
        }
    }

    public String fill(Map<String, String> values) {
        Matcher matcher = PLACEHOLDER.matcher(template);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(out, Matcher.quoteReplacement(values.getOrDefault(matcher.group(1), "")));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    public static String escape(String value) {
        return HtmlUtils.htmlEscape(value, StandardCharsets.UTF_8.name());
    }

    /** Les e-mails sont écrits en français et en anglais : l'anglais pour qui l'a choisi, le français sinon */
    public static Locale localeOf(User user) {
        return user.getPreferredLanguage() == Language.EN ? Locale.ENGLISH : Locale.FRENCH;
    }

    public static String firstName(String fullName) {
        String name = fullName == null ? "" : fullName.strip();
        int space = name.indexOf(' ');
        return space > 0 ? name.substring(0, space) : name;
    }
}
