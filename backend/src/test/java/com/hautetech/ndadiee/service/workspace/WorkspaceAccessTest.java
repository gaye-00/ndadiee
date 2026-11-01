package com.hautetech.ndadiee.service.workspace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.service.project.ProjectService;

/** L'espace d'une équipe est à ses membres ; un projet masqué n'existe pas pour les autres. */
@ExtendWith(MockitoExtension.class)
class WorkspaceAccessTest {

    private static final String SLUG = "lagos-transit";
    private static final Long MEMBER = 2L;
    private static final Long STRANGER = 9L;

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectService projectService;

    @InjectMocks
    private WorkspaceAccess access;

    private final Project project = Project.builder().id(10L).slug(SLUG).build();

    @Test
    void aTeamMemberEnters() {
        when(projectRepository.findBySlug(SLUG)).thenReturn(Optional.of(project));
        when(projectService.isVisibleTo(project, MEMBER)).thenReturn(true);
        when(projectService.isTeamMember(project, MEMBER)).thenReturn(true);

        assertThat(access.member(SLUG, MEMBER)).isSameAs(project);
    }

    @Test
    void someoneOutsideTheTeamIsTurnedAway() {
        when(projectRepository.findBySlug(SLUG)).thenReturn(Optional.of(project));
        when(projectService.isVisibleTo(project, STRANGER)).thenReturn(true);
        when(projectService.isTeamMember(project, STRANGER)).thenReturn(false);

        assertThatThrownBy(() -> access.member(SLUG, STRANGER)).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void aHiddenProjectDoesNotExistOutsideItsTeam() {
        when(projectRepository.findBySlug(SLUG)).thenReturn(Optional.of(project));
        when(projectService.isVisibleTo(project, STRANGER)).thenReturn(false);

        assertThatThrownBy(() -> access.member(SLUG, STRANGER)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void aMemberWhoMovesACardLocksTheProject() {
        when(projectRepository.findBySlug(SLUG)).thenReturn(Optional.of(project));
        when(projectService.isVisibleTo(project, MEMBER)).thenReturn(true);
        when(projectService.isTeamMember(project, MEMBER)).thenReturn(true);
        when(projectRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(project));

        assertThat(access.lockedMember(SLUG, MEMBER)).isSameAs(project);
    }
}
