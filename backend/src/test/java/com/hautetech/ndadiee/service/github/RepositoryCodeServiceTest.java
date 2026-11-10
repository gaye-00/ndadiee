package com.hautetech.ndadiee.service.github;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import com.hautetech.ndadiee.dto.response.ProjectCodeEntry;
import com.hautetech.ndadiee.dto.response.ProjectCodeFileResponse;
import com.hautetech.ndadiee.dto.response.ProjectCodeResponse;
import com.hautetech.ndadiee.exception.CodeUnavailableException;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.github.GithubClient;
import com.hautetech.ndadiee.github.GithubClient.CodeRepository;
import com.hautetech.ndadiee.github.GithubClient.Owner;
import com.hautetech.ndadiee.github.GithubClient.Tree;
import com.hautetech.ndadiee.github.GithubClient.TreeEntry;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.service.project.ProjectService;

/** « Code source » : l'arbre et les fichiers d'un dépôt GitHub public, ou d'un dépôt de démonstration. */
@ExtendWith(MockitoExtension.class)
class RepositoryCodeServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-10T09:00:00Z");

    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private ProjectService projectService;
    @Mock
    private GithubClient client;
    @Mock
    private TransactionTemplate transaction;

    private RepositoryCodeService service;

    @BeforeEach
    void setUp() {
        service = new RepositoryCodeService(projectRepository, projectService, client, new DemoRepositories(), transaction,
                Clock.fixed(NOW, ZoneOffset.UTC));
        lenient().when(transaction.execute(any())).thenAnswer(invocation -> invocation.<TransactionCallback<?>>getArgument(0).doInTransaction(null));
    }

    private void project(String repositoryUrl) {
        Project project = Project.builder().slug("projet").repositoryUrl(repositoryUrl).build();
        when(projectRepository.findBySlug("projet")).thenReturn(Optional.of(project));
        when(projectService.isVisibleTo(project, 7L)).thenReturn(true);
    }

    private void github() {
        when(client.codeRepository("OpenMRS", "openmrs-core"))
                .thenReturn(new CodeRepository("openmrs-core", "https://github.com/openmrs/openmrs-core", "master", new Owner("openmrs", null)));
        when(client.tree("openmrs", "openmrs-core", "master")).thenReturn(new Tree(List.of(
                new TreeEntry("api", "tree", null),
                new TreeEntry("api/Patient.java", "blob", 120L),
                new TreeEntry("docs/logo.png", "blob", 4_000L),
                new TreeEntry("dump.sql", "blob", 2_000_000L),
                new TreeEntry("vendor/lib", "commit", null)), false));
    }

    @Test
    void readsADemoRepositoryWithoutCallingGithub() {
        project("https://example.com/ndadiee-demo/lagos-transit");

        ProjectCodeResponse tree = service.tree("projet", 7L);

        assertThat(tree.getSource()).isEqualTo(ProjectCodeResponse.Source.DEMO);
        assertThat(tree.getRepository()).isEqualTo("ndadiee-demo/lagos-transit");
        assertThat(tree.getBranch()).isEqualTo("main");
        assertThat(tree.getWebUrl()).isNull();
        assertThat(tree.getEntries()).contains(ProjectCodeEntry.directory("internal"), ProjectCodeEntry.directory("internal/schedule"));
        assertThat(tree.getEntries()).extracting(ProjectCodeEntry::path).contains("README.md", "internal/schedule/handler.go");

        ProjectCodeFileResponse file = service.file("projet", "internal/schedule/handler.go", 7L);
        assertThat(file.getContent()).startsWith("package schedule\n");
        assertThat(file.getSize()).isEqualTo(file.getContent().getBytes(StandardCharsets.UTF_8).length);
        verifyNoInteractions(client);
    }

    @Test
    void readsAGithubTreeOnceForHalfAnHour() {
        project("https://github.com/OpenMRS/openmrs-core");
        github();

        ProjectCodeResponse tree = service.tree("projet", 7L);
        service.tree("projet", 7L);

        assertThat(tree.getSource()).isEqualTo(ProjectCodeResponse.Source.GITHUB);
        assertThat(tree.getRepository()).isEqualTo("openmrs/openmrs-core");
        assertThat(tree.getWebUrl()).isEqualTo("https://github.com/openmrs/openmrs-core/tree/master");
        // Le sous-module vit dans un autre dépôt
        assertThat(tree.getEntries()).extracting(ProjectCodeEntry::path).containsExactly("api", "api/Patient.java", "docs/logo.png", "dump.sql");
        verify(client, times(1)).tree(anyString(), anyString(), anyString());
    }

    @Test
    void readsAGithubFileFromItsRawContent() {
        project("https://github.com/OpenMRS/openmrs-core");
        github();
        when(client.rawFile("openmrs", "openmrs-core", "master", "api/Patient.java"))
                .thenReturn("class Patient {}\n".getBytes(StandardCharsets.UTF_8));

        ProjectCodeFileResponse file = service.file("projet", "api/Patient.java", 7L);

        assertThat(file.getContent()).isEqualTo("class Patient {}\n");
        assertThat(file.getWebUrl()).isEqualTo("https://github.com/openmrs/openmrs-core/blob/master/api/Patient.java");
        assertThat(file.getRawUrl()).isNull();
    }

    @Test
    void neitherDownloadsAnImageNorAHugeFile() {
        project("https://github.com/OpenMRS/openmrs-core");
        github();

        ProjectCodeFileResponse image = service.file("projet", "docs/logo.png", 7L);
        ProjectCodeFileResponse dump = service.file("projet", "dump.sql", 7L);

        assertThat(image.isBinary()).isTrue();
        assertThat(image.getRawUrl()).isEqualTo("https://raw.githubusercontent.com/openmrs/openmrs-core/master/docs/logo.png");
        assertThat(dump.isTooLarge()).isTrue();
        assertThat(dump.getContent()).isNull();
        verify(client, never()).rawFile(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void onlyAFileOfTheTreeCanBeAskedFor() {
        project("https://github.com/OpenMRS/openmrs-core");
        github();

        assertThatThrownBy(() -> service.file("projet", "../../etc/passwd", 7L)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.file("projet", "api", 7L)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void aProjectWithoutAGithubRepositoryHasNoCodeToRead() {
        project("https://gitlab.com/ada/lagos-transit");

        assertThatThrownBy(() -> service.tree("projet", 7L)).isInstanceOf(CodeUnavailableException.class);
    }

    @Test
    void aHiddenProjectHasNoCodeForTheOthers() {
        Project project = Project.builder().slug("projet").repositoryUrl("https://example.com/ndadiee-demo/lagos-transit").build();
        when(projectRepository.findBySlug("projet")).thenReturn(Optional.of(project));
        when(projectService.isVisibleTo(project, null)).thenReturn(false);

        assertThatThrownBy(() -> service.tree("projet", null)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void aFileWithANulByteIsBinary() {
        assertThat(RepositoryCodeService.textOf(new byte[] { 'P', 'K', 0, 3 })).isNull();
        assertThat(RepositoryCodeService.textOf("Jërëjëf".getBytes(StandardCharsets.UTF_8))).isEqualTo("Jërëjëf");
    }
}
