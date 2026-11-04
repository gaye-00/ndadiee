package com.hautetech.ndadiee.service.project;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.dto.request.NewProjectRequest;
import com.hautetech.ndadiee.dto.request.ProjectMediaRequest;
import com.hautetech.ndadiee.dto.request.ProjectOpeningRequest;
import com.hautetech.ndadiee.dto.response.ProjectResponse;
import com.hautetech.ndadiee.model.project.MediaKind;
import com.hautetech.ndadiee.model.project.TeamRole;

/** Publier un projet : le projet, puis sa galerie dans l'ordre choisi, puis ses rôles ; la page complète en retour. */
@ExtendWith(MockitoExtension.class)
class ProjectPublishingServiceTest {

    private static final Long OWNER = 1L;
    private static final Long PROJECT_ID = 10L;

    @Mock
    private ProjectService projectService;
    @Mock
    private ProjectMediaService mediaService;
    @Mock
    private ProjectOpeningService openingService;

    @InjectMocks
    private ProjectPublishingService publishingService;

    private static ProjectMediaRequest shot(String name) {
        return ProjectMediaRequest.builder().kind(MediaKind.SCREENSHOT).url("https://media.example.com/" + name + ".webp").build();
    }

    @Test
    void theGalleryAndTheRolesArePublishedWithTheProject() {
        ProjectMediaRequest first = shot("arret");
        ProjectMediaRequest second = shot("carte");
        ProjectOpeningRequest mobile = ProjectOpeningRequest.builder().role(TeamRole.MOBILE).title("Dev mobile").build();
        NewProjectRequest request = NewProjectRequest.builder().name("Lagos Transit").description("Les bus de Lagos.")
                .gallery(List.of(first, second)).openings(List.of(mobile)).build();
        ProjectResponse created = ProjectResponse.builder().id(PROJECT_ID).slug("lagos-transit").build();
        ProjectResponse page = ProjectResponse.builder().id(PROJECT_ID).slug("lagos-transit").build();
        when(projectService.create(OWNER, request)).thenReturn(created);
        when(projectService.getBySlug("lagos-transit", OWNER)).thenReturn(page);

        ProjectResponse published = publishingService.publish(OWNER, request);

        assertThat(published).isSameAs(page);
        InOrder order = inOrder(projectService, mediaService, openingService);
        order.verify(projectService).create(OWNER, request);
        order.verify(mediaService).add(OWNER, PROJECT_ID, first);
        order.verify(mediaService).add(OWNER, PROJECT_ID, second);
        order.verify(openingService).create(OWNER, PROJECT_ID, mobile);
        order.verify(projectService).getBySlug("lagos-transit", OWNER);
    }

    @Test
    void aProjectAloneIsPublishedToo() {
        NewProjectRequest request = NewProjectRequest.builder().name("Paperweight").description("Notes hors ligne.").build();
        when(projectService.create(OWNER, request)).thenReturn(ProjectResponse.builder().id(PROJECT_ID).slug("paperweight").build());

        publishingService.publish(OWNER, request);

        verify(mediaService, never()).add(any(), any(), any());
        verify(openingService, never()).create(any(), any(), any());
    }
}
