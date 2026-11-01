package com.hautetech.ndadiee.service.github;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.dto.response.GithubRepositoryResponse;
import com.hautetech.ndadiee.dto.response.GithubRepositorySummaryResponse;
import com.hautetech.ndadiee.exception.OperationNotAllowedException;
import com.hautetech.ndadiee.github.GithubClient;
import com.hautetech.ndadiee.github.GithubClient.License;
import com.hautetech.ndadiee.github.GithubClient.Owner;
import com.hautetech.ndadiee.github.GithubClient.Repository;
import com.hautetech.ndadiee.github.GithubProperties;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.TagRepository;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.user.UserService;

/** Un dépôt GitHub devient un projet prérempli : accroche, site, licence, technologies, introduction du README. */
@ExtendWith(MockitoExtension.class)
class GithubRepositoryServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-18T09:00:00Z");

    @Mock
    private GithubClient client;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private TagRepository tagRepository;
    @Mock
    private UserService userService;

    private GithubRepositoryService service;

    @BeforeEach
    void setUp() {
        service = new GithubRepositoryService(client, projectRepository, tagRepository, new SlugService(), userService,
                new GithubProperties(null, null, null, Duration.ofMinutes(10)), Clock.fixed(NOW, ZoneOffset.UTC));
        lenient().when(tagRepository.findBySlug(anyString())).thenReturn(Optional.empty());
    }

    private static Repository repository(String name, String homepage, String license, Instant pushedAt, boolean fork) {
        return new Repository(name, "Ada/" + name, "Les prochains bus à Lagos, même hors ligne.", homepage, "https://github.com/Ada/" + name,
                List.of("react-native", "hacktoberfest", "gtfs", "typescript"), license == null ? null : new License(license), "TypeScript", 128, 9, 4,
                false, fork, false, pushedAt, new Owner("Ada", "https://avatars.githubusercontent.com/u/1"));
    }

    private void github(Repository repository) {
        when(client.repository("ada", "lagos-transit")).thenReturn(repository);
        Map<String, Long> languages = new LinkedHashMap<>();
        languages.put("Shell", 90_000L);
        languages.put("Kotlin", 20_000L);
        languages.put("TypeScript", 80_000L);
        languages.put("CSS", 4_000L);
        when(client.languages("Ada", "lagos-transit")).thenReturn(languages);
        when(client.readme("Ada", "lagos-transit")).thenReturn(Optional.of("# Lagos Transit\n\nLes bus de **Lagos**.\n\n## Install\n\nnpm i"));
    }

    @Test
    void aRepositoryPrefillsTheProject() {
        github(repository("lagos-transit", "lagos-transit.app", "MIT", NOW, false));
        when(tagRepository.findBySlug("react-native")).thenReturn(Optional.of(Tag.builder().name("React Native").slug("react-native").build()));

        GithubRepositoryResponse response = service.importRepository("ada", "lagos-transit");

        assertThat(response.getRepositoryUrl()).isEqualTo("https://github.com/Ada/lagos-transit");
        assertThat(response.getHomepage()).isEqualTo("https://lagos-transit.app");
        assertThat(response.getLicense()).isEqualTo("MIT");
        assertThat(response.getLanguages()).containsExactly("Shell", "TypeScript", "Kotlin", "CSS");
        // L'outillage (Shell) n'est pas une technologie du projet, ni un langage marginal (CSS, 4 % du code), ni
        // « hacktoberfest » ; « typescript » rejoint « TypeScript », et « react-native » prend le nom du tag connu
        assertThat(response.getSuggestedTags()).containsExactly("TypeScript", "Kotlin", "React Native", "gtfs");
        assertThat(response.getReadmeExcerpt()).isEqualTo("Les bus de **Lagos**.");
        assertThat(response.getListedProjectSlug()).isNull();
    }

    @Test
    void aRepositoryAlreadyInTheShowcaseIsPointedOut() {
        github(repository("lagos-transit", null, "NOASSERTION", NOW, false));
        when(projectRepository.findSlugsByRepositoryUrls(anyCollection())).thenReturn(List.of("lagos-transit"));

        GithubRepositoryResponse response = service.importRepository("ada", "lagos-transit");

        assertThat(response.getListedProjectSlug()).isEqualTo("lagos-transit");
        // Une licence que GitHub ne reconnaît pas n'en est pas une
        assertThat(response.getLicense()).isNull();
        @SuppressWarnings("unchecked")
        ArgumentCaptor<java.util.Collection<String>> forms = ArgumentCaptor.forClass(java.util.Collection.class);
        verify(projectRepository).findSlugsByRepositoryUrls(forms.capture());
        assertThat(forms.getValue()).contains("https://github.com/ada/lagos-transit", "https://github.com/ada/lagos-transit.git",
                "http://www.github.com/ada/lagos-transit/");
    }

    @Test
    void aRepositoryReadTwiceIsAskedOnceToGithub() {
        github(repository("lagos-transit", null, null, NOW, false));

        service.importRepository("ada", "lagos-transit");
        service.importRepository("Ada", "Lagos-Transit".toLowerCase());

        verify(client, times(1)).repository("ada", "lagos-transit");
    }

    @Test
    void anInvalidAddressIsRefusedWithoutAskingGithub() {
        assertThatThrownBy(() -> service.importRepository("-ada", "x")).isInstanceOf(OperationNotAllowedException.class);
        assertThatThrownBy(() -> service.importRepository("ada", "a/b")).isInstanceOf(OperationNotAllowedException.class);
        verifyNoInteractions(client);
    }

    @Test
    void theMemberSeesTheirOwnRecentRepositories() {
        when(userService.getDeveloperOrThrow(1L)).thenReturn(Developer.builder().githubUrl("https://github.com/Ada/").build());
        when(client.userRepositories("Ada")).thenReturn(List.of(
                repository("old", null, null, NOW.minusSeconds(86_400 * 30), false),
                repository("forked", null, null, NOW, true),
                repository("lagos-transit", null, null, NOW, false)));

        List<GithubRepositorySummaryResponse> repositories = service.memberRepositories(1L);

        assertThat(repositories).extracting(GithubRepositorySummaryResponse::getName).containsExactly("lagos-transit", "old");
    }

    @Test
    void aMemberWithoutGithubHasNoRepositories() {
        when(userService.getDeveloperOrThrow(1L)).thenReturn(Developer.builder().build());

        assertThat(service.memberRepositories(1L)).isEmpty();
        verifyNoInteractions(client);
    }

    @Test
    void theLoginIsReadFromTheProfileAddress() {
        assertThat(GithubRepositoryService.loginOf("https://github.com/ada-lovelace")).contains("ada-lovelace");
        assertThat(GithubRepositoryService.loginOf("github.com/ada?tab=repositories")).contains("ada");
        assertThat(GithubRepositoryService.loginOf("@ada")).contains("ada");
        assertThat(GithubRepositoryService.loginOf("https://gitlab.com/ada")).isEmpty();
    }

    @Test
    void aHomepageWithoutSchemeGetsOne() {
        assertThat(GithubRepositoryService.homepageOf("example.org/app")).isEqualTo("https://example.org/app");
        assertThat(GithubRepositoryService.homepageOf("http://example.org")).isEqualTo("http://example.org");
        assertThat(GithubRepositoryService.homepageOf("not a url")).isNull();
        assertThat(GithubRepositoryService.homepageOf("localhost")).isNull();
    }
}
