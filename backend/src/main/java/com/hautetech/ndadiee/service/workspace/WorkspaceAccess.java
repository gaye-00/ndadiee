package com.hautetech.ndadiee.service.workspace;

import org.springframework.stereotype.Component;

import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.service.project.ProjectService;

import lombok.RequiredArgsConstructor;

/**
 * Qui entre dans l'espace d'une équipe : ses membres seulement (le porteur et les membres acceptés). Un projet masqué
 * par l'administration reste visible à son équipe ; pour les autres, il n'existe pas.
 */
@Component
@RequiredArgsConstructor
public class WorkspaceAccess {

    private final ProjectRepository projectRepository;
    private final ProjectService projectService;

    /** Le projet de l'espace, pour un membre de son équipe. */
    public Project member(String slug, Long userId) {
        Project project = projectRepository.findBySlug(slug)
                .filter(found -> projectService.isVisibleTo(found, userId))
                .orElseThrow(() -> new ResourceNotFoundException("Projet", "slug", slug));
        if (!projectService.isTeamMember(project, userId)) {
            throw new ForbiddenException("L'espace d'équipe est réservé aux membres de l'équipe");
        }
        return project;
    }

    /**
     * Le projet de l'espace, verrouillé jusqu'à la fin de la transaction : pour les gestes qui numérotent ou rangent
     * (créer, déplacer une tâche ; ouvrir, clore un sprint), qui passent ainsi l'un après l'autre.
     */
    public Project lockedMember(String slug, Long userId) {
        Long projectId = member(slug, userId).getId();
        return projectRepository.findByIdForUpdate(projectId).orElseThrow(() -> new ResourceNotFoundException("Projet", projectId));
    }

    /** Le porteur et les mainteneurs gèrent l'équipe : sprints, et ce que d'autres ont écrit. */
    public boolean isManager(Project project, Long userId) {
        return projectService.canManage(project, userId);
    }

    public void requireManager(Project project, Long userId, String message) {
        if (!isManager(project, userId)) {
            throw new ForbiddenException(message);
        }
    }
}
