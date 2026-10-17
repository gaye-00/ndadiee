package com.hautetech.ndadiee.service.project;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.dto.request.DevlogEntryRequest;
import com.hautetech.ndadiee.exception.ForbiddenException;
import com.hautetech.ndadiee.mapper.ProjectMapper;
import com.hautetech.ndadiee.model.project.DevlogEntry;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.DevlogEntryRepository;
import com.hautetech.ndadiee.service.user.UserService;

/** Le devlog se lit par tous ; seule l'équipe du projet y écrit. */
@ExtendWith(MockitoExtension.class)
class DevlogServiceTest {

    private static final Long PROJECT_ID = 10L;
    private static final Long MEMBER = 2L;
    private static final Long STRANGER = 3L;

    @Mock
    private DevlogEntryRepository devlogRepository;
    @Mock
    private ProjectService projectService;
    @Mock
    private UserService userService;
    @Mock
    private ProjectMapper projectMapper;

    @InjectMocks
    private DevlogService devlogService;

    private final Project project = Project.builder().id(PROJECT_ID).build();

    @Test
    void aTeamMemberWritesAnEntry() {
        Developer member = Developer.builder().username("tunde_adeyemi").build();
        member.setId(MEMBER);
        when(projectService.findProjectOrThrow(PROJECT_ID)).thenReturn(project);
        when(projectService.isTeamMember(project, MEMBER)).thenReturn(true);
        when(userService.getDeveloperOrThrow(MEMBER)).thenReturn(member);
        when(devlogRepository.save(any(DevlogEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        devlogService.create(MEMBER, PROJECT_ID, DevlogEntryRequest.builder()
                .version(" v0.6 ")
                .body("Mode hors-ligne : les 20 derniers arrêts consultés restent disponibles.\n")
                .build());

        ArgumentCaptor<DevlogEntry> saved = ArgumentCaptor.forClass(DevlogEntry.class);
        verify(devlogRepository).save(saved.capture());
        assertThat(saved.getValue().getVersion()).isEqualTo("v0.6");
        assertThat(saved.getValue().getBody()).isEqualTo("Mode hors-ligne : les 20 derniers arrêts consultés restent disponibles.");
        assertThat(saved.getValue().getAuthor()).isSameAs(member);
    }

    @Test
    void aBlankVersionIsNoVersion() {
        when(projectService.findProjectOrThrow(PROJECT_ID)).thenReturn(project);
        when(projectService.isTeamMember(project, MEMBER)).thenReturn(true);
        when(devlogRepository.save(any(DevlogEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        devlogService.create(MEMBER, PROJECT_ID, DevlogEntryRequest.builder().version("  ").body("Premier relevé de terrain.").build());

        ArgumentCaptor<DevlogEntry> saved = ArgumentCaptor.forClass(DevlogEntry.class);
        verify(devlogRepository).save(saved.capture());
        assertThat(saved.getValue().getVersion()).isNull();
    }

    @Test
    void onlyTheTeamWritesTheDevlog() {
        when(projectService.findProjectOrThrow(PROJECT_ID)).thenReturn(project);
        when(projectService.isTeamMember(project, STRANGER)).thenReturn(false);

        assertThatThrownBy(() -> devlogService.create(STRANGER, PROJECT_ID,
                DevlogEntryRequest.builder().body("Je passe par là.").build()))
                .isInstanceOf(ForbiddenException.class);
        verify(devlogRepository, never()).save(any(DevlogEntry.class));
    }
}
