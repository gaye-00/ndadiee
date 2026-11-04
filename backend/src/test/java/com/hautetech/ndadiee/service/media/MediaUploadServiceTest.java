package com.hautetech.ndadiee.service.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import com.hautetech.ndadiee.model.media.MediaUpload;
import com.hautetech.ndadiee.model.media.UploadPurpose;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.MediaUploadRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.storage.FileStorage;
import com.hautetech.ndadiee.storage.StorageProperties;

/**
 * Les images d'un projet suivent le projet : rattachées à sa publication, détachées quand il ne les montre plus, et
 * supprimées du stockage après une semaine sans projet, sauf si un projet les montre encore.
 */
@ExtendWith(MockitoExtension.class)
class MediaUploadServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-18T09:00:00Z");
    private static final Long PROJECT_ID = 10L;
    private static final String COVER = "https://media.example.com/projects/1/2026/10/cover.webp";

    @Mock
    private MediaUploadRepository uploadRepository;
    @Mock
    private DeveloperRepository developerRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private FileStorage storage;

    private MediaUploadService service;
    private Project project;

    @BeforeEach
    void setUp() {
        StorageProperties properties = new StorageProperties(null, null, null, 0, Duration.ofDays(7), null);
        service = new MediaUploadService(uploadRepository, developerRepository, projectRepository, storage, properties,
                Clock.fixed(NOW, ZoneOffset.UTC));
        project = Project.builder().id(PROJECT_ID).build();
    }

    private static MediaUpload upload(String key, String url, Project project) {
        return MediaUpload.builder().purpose(UploadPurpose.PROJECT).storageKey(key).url(url).contentType("image/webp")
                .size(1200).project(project).build();
    }

    @Test
    void aStoredFileIsRecordedWithItsOwner() {
        Developer owner = Developer.builder().username("ada").build();
        when(developerRepository.getReferenceById(1L)).thenReturn(owner);

        service.record(1L, UploadPurpose.PROJECT, "projects/1/2026/10/a.webp", COVER, "image/webp", 1200);

        ArgumentCaptor<MediaUpload> saved = ArgumentCaptor.forClass(MediaUpload.class);
        verify(uploadRepository).save(saved.capture());
        assertThat(saved.getValue().getOwner()).isSameAs(owner);
        assertThat(saved.getValue().getProject()).isNull();
        assertThat(saved.getValue().getStorageKey()).isEqualTo("projects/1/2026/10/a.webp");
    }

    @Test
    void publishingAProjectAttachesItsImages() {
        MediaUpload cover = upload("projects/1/a.webp", COVER, null);
        when(uploadRepository.findByPurposeAndUrlIn(eq(UploadPurpose.PROJECT), anyCollection())).thenReturn(List.of(cover));
        when(projectRepository.getReferenceById(PROJECT_ID)).thenReturn(project);

        service.attach(PROJECT_ID, java.util.Arrays.asList(COVER, null, "  "));

        assertThat(cover.getProject()).isSameAs(project);
        // Les adresses vides ne vont pas jusqu'à la base
        verify(uploadRepository).findByPurposeAndUrlIn(UploadPurpose.PROJECT, Set.of(COVER));
    }

    @Test
    void nothingToAttachMeansNoQuery() {
        service.attach(PROJECT_ID, List.of());

        verifyNoInteractions(uploadRepository);
    }

    @Test
    void aReplacedCoverIsReleased() {
        MediaUpload cover = upload("projects/1/a.webp", COVER, project);
        when(uploadRepository.findByProjectIdAndUrlIn(PROJECT_ID, Set.of(COVER))).thenReturn(List.of(cover));

        service.release(PROJECT_ID, List.of(COVER));

        assertThat(cover.getProject()).isNull();
    }

    @Test
    void anImageWithoutProjectForAWeekIsDeletedFromTheStorageAndTheInventory() {
        MediaUpload orphan = upload("projects/1/old.webp", COVER, null);
        when(uploadRepository.findByPurposeAndProjectIsNullAndUpdatedAtBeforeOrderByUpdatedAtAsc(eq(UploadPurpose.PROJECT),
                eq(NOW.minus(Duration.ofDays(7))), any(Pageable.class))).thenReturn(List.of(orphan));
        when(uploadRepository.findProjectsShowing(COVER)).thenReturn(List.of());
        when(uploadRepository.findGalleriesShowing(COVER)).thenReturn(List.of());

        int deleted = service.purgeOrphans();

        assertThat(deleted).isEqualTo(1);
        verify(storage).delete("projects/1/old.webp");
        verify(uploadRepository).delete(orphan);
    }

    @Test
    void anImageStillShownByAProjectIsAttachedInsteadOfDeleted() {
        MediaUpload copied = upload("projects/1/old.webp", COVER, null);
        when(uploadRepository.findByPurposeAndProjectIsNullAndUpdatedAtBeforeOrderByUpdatedAtAsc(any(), any(), any()))
                .thenReturn(List.of(copied));
        when(uploadRepository.findProjectsShowing(COVER)).thenReturn(List.of());
        when(uploadRepository.findGalleriesShowing(COVER)).thenReturn(List.of(PROJECT_ID));
        when(projectRepository.getReferenceById(PROJECT_ID)).thenReturn(project);

        assertThat(service.purgeOrphans()).isZero();

        assertThat(copied.getProject()).isSameAs(project);
        verify(storage, never()).delete(any());
        verify(uploadRepository, never()).delete(any(MediaUpload.class));
    }

    @Test
    void aFailedDeletionKeepsTheImageForTheNextSweep() {
        MediaUpload orphan = upload("projects/1/old.webp", COVER, null);
        when(uploadRepository.findByPurposeAndProjectIsNullAndUpdatedAtBeforeOrderByUpdatedAtAsc(any(), any(), any()))
                .thenReturn(List.of(orphan));
        doThrow(new IllegalStateException("R2 injoignable")).when(storage).delete("projects/1/old.webp");

        assertThat(service.purgeOrphans()).isZero();

        verify(uploadRepository, never()).delete(any(MediaUpload.class));
    }
}
