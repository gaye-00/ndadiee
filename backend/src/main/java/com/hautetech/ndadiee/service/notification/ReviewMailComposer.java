package com.hautetech.ndadiee.service.notification;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

import com.hautetech.ndadiee.event.ReviewActivityEvent.Type;
import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.MailConfiguration;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.ReviewComment;
import com.hautetech.ndadiee.model.review.ReviewState;

/**
 * Écrit un e-mail de revue, dans la langue du destinataire (français ou anglais) : l'objet (« [lagos-transit] Chinedu
 * Okafor demande des changements sur #84 »), puis le même contenu en texte et en HTML (templates/mail/notification.html).
 *
 * Le contenu dit qui a fait quoi sur quelle PR ; il cite le commentaire (son début), la ligne visée et la suggestion
 * de code ; un bouton mène à la revue, et pour un commentaire de ligne, à la ligne elle-même. En pied, pourquoi le
 * membre reçoit cet e-mail, et le lien pour les couper. Tout ce qui vient d'un membre est échappé.
 */
@Component
public class ReviewMailComposer {

    // Le début d'un commentaire suffit : la suite se lit sur la page
    static final int EXCERPT_LENGTH = 600;
    static final int SUGGESTION_LINES = 12;

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{(\\w+)}}");
    private static final Map<ReviewState, String> VERDICT_COLORS = Map.of(
            ReviewState.APPROVED, "#0b7a5f",
            ReviewState.CHANGES_REQUESTED, "#c2382a",
            ReviewState.COMMENTED, "#9a6212");

    private final MessageSource messages;
    private final String frontendUrl;
    private final String template;

    public ReviewMailComposer(@Qualifier(MailConfiguration.MESSAGES) MessageSource messages, @Value("${frontend.url}") String frontendUrl) {
        this.messages = messages;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        this.template = read("templates/mail/notification.html");
    }

    public EmailMessage compose(ReviewMail mail) {
        Locale locale = mail.recipient().getPreferredLanguage() == Language.EN ? Locale.ENGLISH : Locale.FRENCH;
        PullRequest pullRequest = mail.pullRequest();
        ReviewComment comment = mail.comment();
        String project = pullRequest.getProject().getName();
        Object[] args = { mail.actor().getFullName(), String.valueOf(pullRequest.getNumber()), String.valueOf(mail.reward()), project };
        String key = keyOf(mail);

        String subject = "[" + project + "] " + text(locale, key + ".subject", args);
        String headline = text(locale, key + ".headline", args);
        String intro = messages.getMessage(key + ".text", args, "", locale);
        String eyebrow = project + " · #" + pullRequest.getNumber();
        String greeting = text(locale, "mail.greeting", firstName(mail.recipient().getFullName()));
        boolean onLine = comment != null && comment.getPath() != null && comment.getLine() != null;
        String cta = text(locale, onLine ? "mail.ctaLine" : "mail.cta");
        String url = linkOf(mail);
        String reason = text(locale, "mail.reason." + mail.reason());
        String manage = text(locale, "mail.manage");
        String manageUrl = frontendUrl + "/settings#review-emails";
        String location = onLine ? text(locale, "mail.location", comment.getPath(), String.valueOf(comment.getLine())) : null;
        String excerpt = comment == null || comment.getBody() == null ? null : excerpt(comment.getBody());
        String suggestion = onLine && comment.getSuggestion() != null ? suggestionOf(comment.getSuggestion()) : null;
        ReviewState verdict = mail.type() == Type.REVIEWED && comment != null ? comment.getVerdict() : null;

        // ─── Le HTML ───
        StringBuilder content = new StringBuilder();
        if (verdict != null) {
            content.append("<p style=\"margin:0 0 12px 0;\"><span style=\"display:inline-block;padding:3px 10px;border-radius:999px;")
                    .append("font-size:12px;font-weight:700;color:#ffffff;background-color:").append(VERDICT_COLORS.get(verdict)).append(";\">")
                    .append(escape(text(locale, "mail.verdict." + verdict))).append("</span></p>");
        }
        if (!intro.isBlank()) {
            content.append("<p style=\"margin:0 0 12px 0;color:#3b4050;\">").append(escape(intro)).append("</p>");
        }
        if (location != null) {
            content.append("<p style=\"margin:0 0 8px 0;\"><span style=\"display:inline-block;padding:3px 8px;border-radius:8px;")
                    .append("background-color:#f1f1ec;font-family:Menlo,Consolas,'Courier New',monospace;font-size:12px;color:#3b4050;\">")
                    .append(escape(location)).append("</span></p>");
        }
        if (excerpt != null) {
            content.append("<div style=\"margin:0 0 12px 0;padding:10px 14px;border-left:3px solid #ffb547;background-color:#fafaf7;")
                    .append("border-radius:0 10px 10px 0;color:#0d0f16;\">").append(escape(excerpt).replace("\n", "<br>")).append("</div>");
        }
        if (suggestion != null) {
            content.append("<p style=\"margin:0 0 4px 0;font-family:Menlo,Consolas,'Courier New',monospace;font-size:11px;")
                    .append("letter-spacing:0.08em;text-transform:uppercase;color:#9a6212;\">").append(escape(text(locale, "mail.suggestion")))
                    .append("</p><pre style=\"margin:0 0 12px 0;padding:10px 14px;border-radius:10px;background-color:#eef8f4;")
                    .append("font-family:Menlo,Consolas,'Courier New',monospace;font-size:12px;line-height:1.5;color:#0b4f3e;")
                    .append("tab-size:4;white-space:pre-wrap;word-break:break-word;\">").append(escape(suggestion)).append("</pre>");
        }
        String html = fill(Map.ofEntries(
                Map.entry("lang", locale.getLanguage()),
                Map.entry("subject", escape(subject)),
                Map.entry("preheader", escape(excerpt != null ? headline + " — " + oneLine(excerpt) : headline)),
                Map.entry("eyebrow", escape(eyebrow)),
                Map.entry("greeting", escape(greeting)),
                Map.entry("headline", escape(headline)),
                Map.entry("prTitle", escape(pullRequest.getTitle())),
                Map.entry("content", content.toString()),
                Map.entry("ctaUrl", escape(url)),
                Map.entry("ctaLabel", escape(cta)),
                Map.entry("reason", escape(reason)),
                Map.entry("manageUrl", escape(manageUrl)),
                Map.entry("manageLabel", escape(manage)),
                Map.entry("brand", escape(text(locale, "mail.brand")))));

        // ─── Le texte ───
        StringBuilder plain = new StringBuilder()
                .append(greeting).append("\n\n")
                .append(headline).append('\n')
                .append(eyebrow).append(" — ").append(pullRequest.getTitle()).append("\n\n");
        if (verdict != null) {
            plain.append(text(locale, "mail.verdict." + verdict)).append("\n\n");
        }
        if (!intro.isBlank()) {
            plain.append(intro).append("\n\n");
        }
        if (location != null) {
            plain.append(location).append('\n');
        }
        if (excerpt != null) {
            plain.append(excerpt.lines().map(line -> "> " + line).reduce((a, b) -> a + "\n" + b).orElse("")).append("\n\n");
        }
        if (suggestion != null) {
            plain.append(text(locale, "mail.suggestion")).append('\n')
                    .append(suggestion.lines().map(line -> "    " + line).reduce((a, b) -> a + "\n" + b).orElse("")).append("\n\n");
        }
        // Chaque lien sur sa ligne : la ponctuation d'avant un lien change d'une langue à l'autre
        plain.append(cta).append('\n').append(url).append("\n\n-- \n")
                .append(reason).append('\n')
                .append(manage).append('\n').append(manageUrl).append('\n');

        return new EmailMessage(mail.recipient().getId(), mail.recipient().getEmail(), subject, plain.toString(), html,
                "review." + key.toLowerCase(Locale.ROOT));
    }

    /** Le texte qui dit ce qui s'est passé : selon le geste, pourquoi on est prévenu, et le verdict d'une revue. */
    static String keyOf(ReviewMail mail) {
        return switch (mail.type()) {
            case COMMENTED -> "COMMENTED." + (mail.reason() == ReviewMail.Reason.AUTHOR ? "AUTHOR" : "PARTICIPANT");
            case REVIEWED -> "REVIEWED." + (mail.comment() == null || mail.comment().getVerdict() == null
                    ? ReviewState.COMMENTED : mail.comment().getVerdict());
            case CLAIMED -> "CLAIMED";
            case JUDGED_HELPFUL -> "JUDGED_HELPFUL";
        };
    }

    /**
     * La page de la revue : la ligne commentée pour un commentaire de ligne (#file-…-R24), la conversation pour un
     * commentaire, un verdict ou une revue jugée utile, la revue elle-même pour une proposition de relecture.
     */
    String linkOf(ReviewMail mail) {
        PullRequest pullRequest = mail.pullRequest();
        String page = frontendUrl + "/projects/" + pullRequest.getProject().getSlug() + "/reviews/" + pullRequest.getNumber();
        ReviewComment comment = mail.comment();
        if (comment != null && comment.getPath() != null && comment.getLine() != null) {
            return page + "#" + fileAnchor(comment.getPath()) + "-R" + comment.getLine();
        }
        return mail.type() == Type.CLAIMED ? page : page + "?tab=conversation";
    }

    /**
     * L'ancre d'un fichier dans la page, comme le site la calcule (frontend lib/diff.ts, fileAnchor) : le hachage djb2
     * du chemin, sur ses unités UTF-16, en base 36.
     */
    static String fileAnchor(String path) {
        int hash = 5381;
        for (int index = 0; index < path.length(); index++) {
            hash = (hash << 5) + hash + path.charAt(index);
        }
        return "file-" + Integer.toUnsignedString(hash, 36);
    }

    // Le début du commentaire, coupé sur un espace
    static String excerpt(String body) {
        String text = body.strip().replace("\r\n", "\n");
        if (text.length() <= EXCERPT_LENGTH) {
            return text;
        }
        int cut = text.lastIndexOf(' ', EXCERPT_LENGTH);
        return text.substring(0, cut > EXCERPT_LENGTH / 2 ? cut : EXCERPT_LENGTH).stripTrailing() + "…";
    }

    // Les premières lignes du code proposé
    private static String suggestionOf(String suggestion) {
        String[] lines = suggestion.split("\n", -1);
        return lines.length <= SUGGESTION_LINES ? suggestion : String.join("\n", Arrays.copyOf(lines, SUGGESTION_LINES)) + "\n…";
    }

    private static String oneLine(String text) {
        return text.replaceAll("\\s+", " ").strip();
    }

    private static String firstName(String fullName) {
        String name = fullName == null ? "" : fullName.strip();
        int space = name.indexOf(' ');
        return space > 0 ? name.substring(0, space) : name;
    }

    private String text(Locale locale, String code, Object... args) {
        return messages.getMessage(code, args, locale);
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
