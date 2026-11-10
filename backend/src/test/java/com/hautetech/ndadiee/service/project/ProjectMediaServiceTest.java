package com.hautetech.ndadiee.service.project;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.dto.request.ProjectMediaRequest;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.model.project.MediaKind;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.project.ProjectMedia;
import com.hautetech.ndadiee.repository.ProjectMediaRepository;
import com.hautetech.ndadiee.service.media.MediaUploadService;
import com.hautetech.ndadiee.service.user.UserService;

/**
 * Modifier la galerie d'un projet : les images déjà là se reconnaissent à leur adresse et prennent leur nouvelle
 * légende et leur nouveau rang ; les absentes partent, les nouvelles arrivent.
 */
@ExtendWith(MockitoExtension.class)
class ProjectMediaServiceTest {

    @Mock
    private ProjectMediaRepository mediaRepository;
    @Mock
    private ProjectService projectService;
    @Mock
    private UserService userService;
    @Mock
    private MediaUploadService mediaUploadService;
    @Mock
    private ProjectMapper projectMapper;

    @InjectMocks
    private ProjectMediaService service;

    private Project project;

    @BeforeEach
    void setUp() {
        project = Project.builder().name("Lagos Transit").build();
        project.setId(3L);
        when(projectService.findProjectOrThrow(3L)).thenReturn(project);
        when(projectService.canManage(project, 7L)).thenReturn(true);
    }

    private ProjectMedia media(long id, String url, int position) {
        ProjectMedia media = ProjectMedia.builder().project(project).url(url).thumbnailUrl(url + "?thumb").kind(MediaKind.SCREENSHOT)
                .position(position).caption("ancienne").build();
        media.setId(id);
        return media;
    }

    private static ProjectMediaRequest shot(String url, String caption) {
        return ProjectMediaRequest.builder().kind(MediaKind.SCREENSHOT).url(url).thumbnailUrl(url + "?thumb").caption(caption)
                .width(1280).height(720).build();
    }

    @Test
    void theGalleryBecomesWhatTheFormSent() {
        ProjectMedia first = media(1, "https://cdn.test/a.webp", 0);
        ProjectMedia second = media(2, "https://cdn.test/b.webp", 1);
        when(mediaRepository.findByProjectIdOrderByPositionAscIdAsc(3L)).thenReturn(new ArrayList<>(List.of(first, second)));

        service.replaceGallery(7L, 3L, List.of(
                shot("https://cdn.test/b.webp", "Le tableau des départs"),
                shot("https://cdn.test/c.webp", "La carte")));

        // b passe en tête avec sa nouvelle légende ; c arrive en second ; a part
        assertThat(second.getPosition()).isZero();
        assertThat(second.getCaption()).isEqualTo("Le tableau des départs");
        ArgumentCaptor<ProjectMedia> saved = ArgumentCaptor.forClass(ProjectMedia.class);
        verify(mediaRepository, org.mockito.Mockito.times(2)).save(saved.capture());
        ProjectMedia added = saved.getAllValues().get(1);
        assertThat(added.getUrl()).isEqualTo("https://cdn.test/c.webp");
        assertThat(added.getPosition()).isEqualTo(1);
        assertThat(added.getProject()).isSameAs(project);
        verify(mediaRepository).delete(first);
        verify(mediaRepository, never()).delete(second);
        verify(mediaUploadService).release(eq(3L), eq(List.of("https://cdn.test/a.webp", "https://cdn.test/a.webp?thumb")));
        verify(mediaUploadService).attach(eq(3L), anyCollection());
    }

    @Test
    void anEmptyListEmptiesTheGallery() {
        ProjectMedia only = media(1, "https://cdn.test/a.webp", 0);
        when(mediaRepository.findByProjectIdOrderByPositionAscIdAsc(3L)).thenReturn(new ArrayList<>(List.of(only)));

        service.replaceGallery(7L, 3L, List.of());

        verify(mediaRepository).delete(only);
        verify(mediaRepository, never()).save(any());
    }
}
