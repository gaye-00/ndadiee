package com.hautetech.ndadiee.common;

import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/**
 * Adresses des médias (couvertures de projets...). Une image est soit une adresse complète, hébergée
 * ailleurs, soit le chemin d'un fichier servi par l'API elle-même (« media/demo/projects/x.webp »,
 * dans resources/static/media) : ce chemin devient une adresse complète, sur l'hôte de la requête.
 * Ainsi les données de démonstration fonctionnent quel que soit le domaine ou le port de l'API.
 */
public final class MediaUrls {

    private MediaUrls() {
    }

    public static String absolute(String url) {
        if (url == null || url.isBlank() || url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        // Hors d'une requête HTTP (tâche de fond, test) : le chemin tel quel
        if (RequestContextHolder.getRequestAttributes() == null) {
            return url;
        }
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/")
                .path(url.startsWith("/") ? url.substring(1) : url)
                .toUriString();
    }
}
