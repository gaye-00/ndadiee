package com.hautetech.ndadiee.service.project;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.NewProjectRequest;
import com.hautetech.ndadiee.dto.request.ProjectUpdateRequest;
import com.hautetech.ndadiee.dto.response.ProjectResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Publier un projet depuis le formulaire (/projects/new) : le projet, sa galerie et ses rôles recherchés, dans une
 * seule transaction. Si une image ou un rôle est refusé, rien n'est publié : le porteur corrige et republie, sans
 * projet à moitié créé dans la vitrine.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ProjectPublishingService {

    private final ProjectService projectService;
    private final ProjectMediaService mediaService;
    private final ProjectOpeningService openingService;

    /** @return le projet tel que sa page le montre : sa galerie et ses rôles ouverts compris */
    public ProjectResponse publish(Long userId, NewProjectRequest request) {
        ProjectResponse created = projectService.create(userId, request);
        Long projectId = created.getId();

        // Les images entrent dans la galerie dans l'ordre reçu : celui que le porteur a choisi
        orEmpty(request.getGallery()).forEach(media -> mediaService.add(userId, projectId, media));
        orEmpty(request.getOpenings()).forEach(opening -> openingService.create(userId, projectId, opening));

        log.info("[Project] Publié - ID: {} - {} image(s), {} rôle(s)", projectId, orEmpty(request.getGallery()).size(),
                orEmpty(request.getOpenings()).size());
        return projectService.getBySlug(created.getSlug(), userId);
    }

    /**
     * Modifier un projet depuis son formulaire : ce qu'en dit le porteur et, s'il l'envoie, sa galerie, ensemble ou pas
     * du tout (un refus défait tout). La galerie d'abord : la couverture, rattachée ensuite, garde son fichier même s'il
     * servait aussi à la galerie.
     *
     * @return le projet tel que sa page le montre
     */
    public ProjectResponse update(Long userId, Long projectId, ProjectUpdateRequest request) {
        if (request.getGallery() != null) {
            mediaService.replaceGallery(userId, projectId, request.getGallery());
        }
        ProjectResponse updated = projectService.update(userId, projectId, request);
        return projectService.getBySlug(updated.getSlug(), userId);
    }

    private static <T> List<T> orEmpty(List<T> list) {
        return list == null ? List.of() : list;
    }
}
