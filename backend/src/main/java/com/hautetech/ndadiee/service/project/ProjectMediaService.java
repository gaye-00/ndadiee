package com.hautetech.ndadiee.service.project;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.request.ProjectMediaRequest;
import com.hautetech.ndadiee.dto.response.ProjectMediaResponse;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMedia;
import com.hautetech.ndadiee.repository.ProjectMediaRepository;
import com.hautetech.ndadiee.service.media.MediaUploadService;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Galerie d'un projet : captures et photos, après la couverture. Le porteur et ses mainteneurs la gèrent ;
 * la page du projet la renvoie (ProjectResponse.gallery).
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ProjectMediaService {

    // Images au plus dans une galerie
    static final int MAX_MEDIA = 12;

    private final ProjectMediaRepository mediaRepository;
    private final ProjectService projectService;
    private final UserService userService;
    private final MediaUploadService mediaUploadService;
    private final ProjectMapper projectMapper;

    /** Ajoute une image à la fin de la galerie. */
    public ProjectMediaResponse add(Long userId, Long projectId, ProjectMediaRequest request) {
        Project project = projectService.findProjectOrThrow(projectId);
        requireManager(project, userId);
        if (mediaRepository.countByProjectId(projectId) >= MAX_MEDIA) {
            throw new OperationNotAllowedException("La galerie compte déjà " + MAX_MEDIA + " images");
        }

        ProjectMedia saved = mediaRepository.save(ProjectMedia.builder()
                .project(project)
                .position(mediaRepository.nextPosition(projectId))
                .kind(request.getKind())
                .url(request.getUrl().trim())
                .thumbnailUrl(blankToNull(request.getThumbnailUrl()))
                .caption(blankToNull(request.getCaption()))
                .credit(blankToNull(request.getCredit()))
                .sourceUrl(blankToNull(request.getSourceUrl()))
                .width(request.getWidth())
                .height(request.getHeight())
                .build());
        mediaUploadService.attach(projectId, imagesOf(saved));
        log.info("[Media] Image {} ajoutée au projet {} par {}", saved.getId(), projectId, userId);
        return projectMapper.toMediaResponse(saved);
    }

    /**
     * La galerie telle qu'elle doit être, dans l'ordre : une image déjà là (même adresse) est gardée, avec sa nouvelle
     * légende et son nouveau rang ; les absentes sont retirées, les nouvelles ajoutées.
     */
    public void replaceGallery(Long userId, Long projectId, List<ProjectMediaRequest> wanted) {
        Project project = projectService.findProjectOrThrow(projectId);
        requireManager(project, userId);
        if (wanted.size() > MAX_MEDIA) {
            throw new OperationNotAllowedException("La galerie compte au plus " + MAX_MEDIA + " images", "gallery");
        }

        Map<String, ProjectMedia> current = new HashMap<>();
        mediaRepository.findByProjectIdOrderByPositionAscIdAsc(projectId).forEach(media -> current.putIfAbsent(media.getUrl(), media));
        List<String> kept = new ArrayList<>();
        for (int position = 0; position < wanted.size(); position++) {
            ProjectMediaRequest request = wanted.get(position);
            String url = request.getUrl().trim();
            ProjectMedia media = current.remove(url);
            if (media == null) {
                media = ProjectMedia.builder().project(project).url(url)
                        .thumbnailUrl(blankToNull(request.getThumbnailUrl()))
                        .width(request.getWidth())
                        .height(request.getHeight())
                        .build();
            }
            media.setPosition(position);
            media.setKind(request.getKind());
            media.setCaption(blankToNull(request.getCaption()));
            media.setCredit(blankToNull(request.getCredit()));
            media.setSourceUrl(blankToNull(request.getSourceUrl()));
            mediaRepository.save(media);
            kept.addAll(imagesOf(media).stream().filter(Objects::nonNull).toList());
        }
        // Celles qui ne sont plus dans la galerie : leurs fichiers seront supprimés s'ils ne servent plus ailleurs
        current.values().forEach(media -> {
            mediaRepository.delete(media);
            mediaUploadService.release(projectId, imagesOf(media));
        });
        mediaUploadService.attach(projectId, kept);
        log.info("[Media] Galerie du projet {} mise à jour par {} : {} image(s), {} retirée(s)", projectId, userId,
                wanted.size(), current.size());
    }

    public void delete(Long userId, Long projectId, Long mediaId) {
        ProjectMedia media = mediaRepository.findById(mediaId)
                .filter(candidate -> candidate.getProject().getId().equals(projectId))
                .orElseThrow(() -> new ResourceNotFoundException("Image", mediaId));
        requireManager(media.getProject(), userId);
        mediaRepository.delete(media);
        mediaUploadService.release(projectId, imagesOf(media));
        log.info("[Media] Image {} retirée du projet {} par {}", mediaId, projectId, userId);
    }

    private void requireManager(Project project, Long userId) {
        if (!projectService.canManage(project, userId) && !userService.canModerate(userId)) {
            throw new ForbiddenException("Seuls le porteur du projet et ses mainteneurs gèrent sa galerie");
        }
    }

    // La grande image et sa miniature
    private static List<String> imagesOf(ProjectMedia media) {
        return Arrays.asList(media.getUrl(), media.getThumbnailUrl());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
