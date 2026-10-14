package com.hautetech.ndadiee.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

import org.springframework.stereotype.Service;

@Service
public class SlugService {

    private static final int MAX_LENGTH = 80;
    private static final String FALLBACK = "sans-titre";

    /**
     * Transforme un texte libre en slug d'URL : minuscules, sans accents, mots séparés par des tirets.
     * « Comment déployer Spring Boot ? » → « comment-deployer-spring-boot ».
     */
    public String toSlug(String text) {
        String slug = Normalizer.normalize(text == null ? "" : text.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                // Sans ces règles, C, C++ et C# donneraient tous le slug « c »
                .replace("++", "pp")
                .replace("#", "sharp")
                .replaceAll("^\\.", "dot")
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");

        if (slug.length() > MAX_LENGTH) {
            slug = slug.substring(0, MAX_LENGTH).replaceAll("-+$", "");
        }
        // Titre entièrement en caractères non latins (arabe, amharique...) : rien à translittérer
        return slug.isEmpty() ? FALLBACK : slug;
    }

    /**
     * Génère un slug libre : si « mon-titre » est pris, essaie « mon-titre-2 », « mon-titre-3 »...
     *
     * @param slugExists indique si un slug est déjà utilisé (en général repository::existsBySlug)
     */
    public String generateUniqueSlug(String text, Predicate<String> slugExists) {
        String base = toSlug(text);
        String candidate = base;
        int suffix = 2;
        while (slugExists.test(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }
}
