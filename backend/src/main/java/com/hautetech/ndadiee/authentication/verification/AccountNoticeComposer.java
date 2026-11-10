package com.hautetech.ndadiee.authentication.verification;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.MailConfiguration;
import com.hautetech.ndadiee.mail.MailTemplate;
import com.hautetech.ndadiee.model.user.User;

/**
 * Les avis de sécurité du compte, dans la langue du membre (templates/mail/notice.html) : son mot de passe a changé,
 * la suppression de son compte est programmée, son compte est supprimé. Chacun dit quoi faire si ce n'était pas lui.
 */
@Component
public class AccountNoticeComposer {

    /** L'avis : ses textes (mail_*.properties), sa nature dans le journal, et la page où mène son bouton */
    public enum Notice {
        PASSWORD_CHANGED("passwordChanged", "auth.password-changed", "/forgot-password"),
        DELETION_SCHEDULED("deletionScheduled", "auth.deletion-scheduled", "/login"),
        ACCOUNT_DELETED("accountDeleted", "auth.account-deleted", null);

        private final String prefix;
        private final String tag;
        private final String page;

        Notice(String prefix, String tag, String page) {
            this.prefix = prefix;
            this.tag = tag;
            this.page = page;
        }
    }

    private final MessageSource messages;
    private final MailTemplate template;
    private final String frontendUrl;

    public AccountNoticeComposer(@Qualifier(MailConfiguration.MESSAGES) MessageSource messages,
            @Value("${frontend.url}") String frontendUrl) {
        this.messages = messages;
        this.template = MailTemplate.load("templates/mail/notice.html");
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    }

    /**
     * @param date la date que l'avis annonce (suppression programmée), ou null
     */
    public EmailMessage compose(User user, Notice notice, Instant date) {
        Locale locale = MailTemplate.localeOf(user);
        Object[] args = { date == null ? "" : DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(locale)
                .format(date.atZone(ZoneOffset.UTC)) };
        String subject = text(locale, notice.prefix + ".subject", args);
        String greeting = text(locale, "mail.greeting", MailTemplate.firstName(user.getFullName()));
        String headline = text(locale, notice.prefix + ".headline", args);
        String intro = text(locale, notice.prefix + ".intro", args);
        String footnote = text(locale, notice.prefix + ".footnote", args);
        String brand = text(locale, "mail.brand");
        String ctaLabel = notice.page == null ? null : text(locale, notice.prefix + ".cta", args);
        String ctaUrl = notice.page == null ? null : frontendUrl + notice.page;

        String cta = ctaLabel == null ? "" : """
                <a href="%s" target="_blank" style="display:inline-block;padding:12px 22px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:#07080d;text-decoration:none;border-radius:12px;background-color:#ffb547;">%s &rarr;</a>"""
                .formatted(MailTemplate.escape(ctaUrl), MailTemplate.escape(ctaLabel));
        String html = template.fill(Map.ofEntries(
                Map.entry("lang", locale.getLanguage()),
                Map.entry("subject", MailTemplate.escape(subject)),
                Map.entry("preheader", MailTemplate.escape(intro)),
                Map.entry("greeting", MailTemplate.escape(greeting)),
                Map.entry("headline", MailTemplate.escape(headline)),
                Map.entry("intro", MailTemplate.escape(intro)),
                Map.entry("cta", cta),
                Map.entry("footnote", MailTemplate.escape(footnote)),
                Map.entry("brand", MailTemplate.escape(brand))));
        String plain = greeting + "\n\n" + headline + "\n\n" + intro + "\n\n"
                + (ctaLabel == null ? "" : ctaLabel + " : " + ctaUrl + "\n\n")
                + footnote + "\n\n— " + brand + "\n";
        return new EmailMessage(user.getId(), user.getEmail(), subject, plain, html, notice.tag);
    }

    private String text(Locale locale, String code, Object... args) {
        return messages.getMessage(code, args, locale);
    }
}
