package com.hautetech.ndadiee.initializer;

import com.hautetech.ndadiee.dto.request.ProjectRequest;

/**
 * La couverture d'un projet de démonstration : une photo de Wikimedia Commons, recadrée en 16:10 et servie par l'API
 * (resources/static/media/demo/projects, en 1280 et 640 px ; voir CREDITS.md). Le projet affiche son crédit (auteur et
 * licence) et un lien vers l'original. Sans couverture, sa page, sa carte de la vitrine et les profils de son équipe
 * n'affichent qu'un cadre vide.
 *
 * @param slug le nom du fichier, celui du projet
 * @param credit « auteur · licence »
 * @param sourceUrl la page de la photo sur Commons
 */
record DemoCover(String slug, String credit, String sourceUrl) {

    static final String MEDIA = "media/demo/projects/";
    private static final String COMMONS = "https://commons.wikimedia.org/wiki/File:";

    /** {@code commonsFile} : le nom du fichier sur Commons, tel qu'il apparaît dans son adresse (encodé). */
    static DemoCover of(String slug, String author, String license, String commonsFile) {
        return new DemoCover(slug, author + " · " + license, COMMONS + commonsFile);
    }

    /** Pose la couverture et sa miniature sur la demande de création du projet. */
    ProjectRequest.ProjectRequestBuilder applyTo(ProjectRequest.ProjectRequestBuilder project) {
        return project
                .coverUrl(MEDIA + slug + ".webp")
                .coverThumbnailUrl(MEDIA + slug + "-640.webp")
                .coverCredit(credit)
                .coverSourceUrl(sourceUrl);
    }
}
