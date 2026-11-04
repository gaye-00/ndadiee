package com.hautetech.ndadiee.config;

import java.time.Duration;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.core.convert.converter.ConverterFactory;
import org.springframework.format.FormatterRegistry;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.hautetech.ndadiee.storage.FileStorage;
import com.hautetech.ndadiee.storage.LocalFileStorage;

import lombok.RequiredArgsConstructor;

/**
 * Classe de configuration Spring MVC de l'application Ndadiee.
 *
 * Configure la mise à disposition des ressources statiques,
 * définit les politiques de mise en cache des médias et ajoute
 * un convertisseur permettant de traiter les paramètres d'URL
 * correspondant aux énumérations sans tenir compte de la casse.
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final FileStorage fileStorage;

    /**
     * Médias servis par l'API elle-même (resources/static/media), comme les couvertures des projets de
     * démonstration. Ils ne changent pas d'une version à l'autre : le navigateur les garde un mois.
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/media/**")
                .addResourceLocations("classpath:/static/media/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic());

        // Images des membres gardées sur le disque (développement, sans R2) : un fichier ne change jamais
        if (fileStorage instanceof LocalFileStorage local) {
            registry.addResourceHandler("/" + LocalFileStorage.URL_PREFIX + "**")
                    .addResourceLocations(local.root().toUri() + "/")
                    .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
        }
    }

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverterFactory(new CaseInsensitiveEnumConverterFactory());
    }

    /**
     * Accepte les enums des paramètres d'URL sans tenir compte de la casse :
     * ?type=job comme ?type=JOB, ?language=fr comme ?language=FR.
     */
    @SuppressWarnings({ "rawtypes", "unchecked" })
    private static class CaseInsensitiveEnumConverterFactory implements ConverterFactory<String, Enum> {

        @Override
        public <T extends Enum> Converter<String, T> getConverter(Class<T> targetType) {
            return source -> source.isBlank() ? null : (T) Enum.valueOf(targetType, source.trim().toUpperCase());
        }
    }
}
