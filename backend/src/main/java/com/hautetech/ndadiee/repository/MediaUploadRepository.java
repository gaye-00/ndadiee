package com.hautetech.ndadiee.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.media.MediaUpload;
import com.hautetech.ndadiee.model.media.UploadPurpose;

public interface MediaUploadRepository extends JpaRepository<MediaUpload, Long> {

    List<MediaUpload> findByPurposeAndUrlIn(UploadPurpose purpose, Collection<String> urls);

    List<MediaUpload> findByProjectIdAndUrlIn(Long projectId, Collection<String> urls);

    /** Les images de ce type qu'aucun projet ne montre depuis `cutoff`, les plus anciennes d'abord */
    List<MediaUpload> findByPurposeAndProjectIsNullAndUpdatedAtBeforeOrderByUpdatedAtAsc(UploadPurpose purpose, Instant cutoff,
            Pageable pageable);

    /** Les projets dont la couverture (ou sa miniature, ou le logo) est à cette adresse */
    @Query("select p.id from Project p where p.coverUrl = :url or p.coverThumbnailUrl = :url or p.logoUrl = :url")
    List<Long> findProjectsShowing(@Param("url") String url);

    /** Les projets dont la galerie montre cette adresse */
    @Query("select m.project.id from ProjectMedia m where m.url = :url or m.thumbnailUrl = :url")
    List<Long> findGalleriesShowing(@Param("url") String url);
}
