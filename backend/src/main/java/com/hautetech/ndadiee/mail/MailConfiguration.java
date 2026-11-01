package com.hautetech.ndadiee.mail;

import java.nio.charset.StandardCharsets;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;

/** Les e-mails de notification : leurs réglages (ndadiee.mail) et leurs textes, en français et en anglais. */
@Configuration
@EnableConfigurationProperties(MailProperties.class)
public class MailConfiguration {

    public static final String MESSAGES = "mailMessages";

    /** Les textes des e-mails : mail_fr.properties, mail_en.properties ; le français par défaut. */
    @Bean(name = MESSAGES)
    public ResourceBundleMessageSource mailMessages() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("i18n/mail");
        source.setDefaultEncoding(StandardCharsets.UTF_8.name());
        source.setFallbackToSystemLocale(false);
        return source;
    }
}
