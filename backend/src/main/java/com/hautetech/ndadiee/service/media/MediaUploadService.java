package com.hautetech.ndadiee.service.media;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.model.media.MediaUpload;
import com.hautetech.ndadiee.model.media.UploadPurpose;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.MediaUploadRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.storage.FileStorage;
import com.hautetech.ndadiee.storage.StorageProperties;

import lombok.extern.slf4j.Slf4j;

/**
 * L'inventaire des fichiers envoyés par les membres, et le ménage des images de projet que plus rien ne montre.
 *
 * <p>Une image de projet est envoyée dès qu'on la choisit dans le formulaire, avant que le projet n'existe : le
 * projet publié la rattache (attach), la couverture remplacée ou la capture retirée la détache (release), le projet
 * supprimé la détache aussi (clé étrangère ON DELETE SET NULL). Une image restée sans projet pendant le délai de
 * garde est supprimée du stockage, puis de l'inventaire : le brouillon d'un projet garde ses images une semaine.</p>
 *
 * <p>Avant de supprimer, on vérifie qu'aucun projet ne montre l'image : si l'un d'eux la montre (une adresse
 * recopiée d'un projet à l'autre), elle lui est rattachée au lieu d'être supprimée.</p>
 */
@Slf4j
@Service
@Transactional
public class MediaUploadService {

    // Images examinées à chaque passage : le reste attend le suivant
    static final int PURGE_BATCH = 200;

    private final MediaUploadRepository uploadRepository;
    private final DeveloperRepository developerRepository;
    private final ProjectRepository projectRepository;
    private final FileStorage storage;
    private final Duration retention;
    private final Clock clock;

    @Autowired
    public MediaUploadService(MediaUploadRepository uploadRepository, DeveloperRepository developerRepository,
            ProjectRepository projectRepository, FileStorage storage, StorageProperties properties) {
        this(uploadRepository, developerRepository, projectRepository, storage, properties, Clock.systemUTC());
    }

    // Pour les tests : une horloge arrêtée
    MediaUploadService(MediaUploadRepository uploadRepository, DeveloperRepository developerRepository,
            ProjectRepository projectRepository, FileStorage storage, StorageProperties properties, Clock clock) {
        this.uploadRepository = uploadRepository;
        this.developerRepository = developerRepository;
        this.projectRepository = projectRepository;
        this.storage = storage;
        this.retention = properties.orphanRetention();
        this.clock = clock;
    }

    /** Inscrit à l'inventaire un fichier qui vient d'être rangé dans le stockage. */
    public void record(Long ownerId, UploadPurpose purpose, String key, String url, String contentType, long size) {
        uploadRepository.save(MediaUpload.builder()
                .owner(developerRepository.getReferenceById(ownerId))
                .purpose(purpose)
                .storageKey(key)
                .url(url)
                .contentType(contentType)
                .size(size)
                .build());
    }

    /**
     * Le projet montre désormais ces images (couverture, miniature, captures de sa galerie). Les adresses qui ne
     * sont pas des images de projet de l'inventaire (une photo hébergée ailleurs, un média de démonstration) sont
     * ignorées.
     */
    public void attach(Long projectId, Collection<String> urls) {
        Set<String> wanted = clean(urls);
        if (wanted.isEmpty()) {
            return;
        }
        uploadRepository.findByPurposeAndUrlIn(UploadPurpose.PROJECT, wanted).stream()
                .filter(upload -> upload.getProject() == null || !upload.getProject().getId().equals(projectId))
                .forEach(upload -> upload.setProject(projectRepository.getReferenceById(projectId)));
    }

    /** Le projet ne montre plus ces images : elles partiront après le délai de garde, si rien d'autre ne les montre. */
    public void release(Long projectId, Collection<String> urls) {
        Set<String> released = clean(urls);
        if (released.isEmpty()) {
            return;
        }
        uploadRepository.findByProjectIdAndUrlIn(projectId, released).forEach(upload -> upload.setProject(null));
    }

    /**
     * Supprime les images de projet restées sans projet pendant le délai de garde. Toutes les heures ; une image dont
     * la suppression échoue (stockage injoignable) reste à l'inventaire et sera reprise au passage suivant.
     *
     * @return le nombre d'images supprimées
     */
    @Scheduled(initialDelayString = "${ndadiee.storage.orphan-sweep-delay:PT10M}", fixedDelayString = "${ndadiee.storage.orphan-sweep-interval:PT1H}")
    public int purgeOrphans() {
        Instant cutoff = clock.instant().minus(retention);
        List<MediaUpload> orphans = uploadRepository.findByPurposeAndProjectIsNullAndUpdatedAtBeforeOrderByUpdatedAtAsc(
                UploadPurpose.PROJECT, cutoff, PageRequest.of(0, PURGE_BATCH));
        int deleted = 0;
        for (MediaUpload orphan : orphans) {
            Long shownBy = projectShowing(orphan.getUrl());
            if (shownBy != null) {
                orphan.setProject(projectRepository.getReferenceById(shownBy));
                log.info("[Media] {} est montrée par le projet {} : rattachée", orphan.getStorageKey(), shownBy);
                continue;
            }
            try {
                storage.delete(orphan.getStorageKey());
            } catch (RuntimeException e) {
                log.warn("[Media] Suppression de {} impossible, reprise au prochain passage : {}", orphan.getStorageKey(), e.getMessage());
                continue;
            }
            uploadRepository.delete(orphan);
            deleted++;
        }
        if (deleted > 0) {
            log.info("[Media] {} image(s) de projet sans projet depuis {} jours supprimée(s)", deleted, retention.toDays());
        }
        return deleted;
    }

    // Un projet qui montre l'adresse, par sa couverture ou par sa galerie
    private Long projectShowing(String url) {
        return uploadRepository.findProjectsShowing(url).stream()
                .findFirst()
                .or(() -> uploadRepository.findGalleriesShowing(url).stream().findFirst())
                .orElse(null);
    }

    private static Set<String> clean(Collection<String> urls) {
        return urls == null ? Set.of() : urls.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(url -> !url.isEmpty())
                .collect(Collectors.toSet());
    }
}
