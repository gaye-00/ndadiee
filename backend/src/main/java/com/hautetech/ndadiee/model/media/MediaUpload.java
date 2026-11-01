package com.hautetech.ndadiee.model.media;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Un fichier envoyé par un membre, tel qu'il est rangé dans le stockage (R2, ou le disque en développement) :
 * l'inventaire des fichiers de chacun, et pour une image de projet, le projet qui la montre. Une image de projet
 * sans projet (brouillon abandonné, couverture remplacée, projet supprimé) est supprimée après le délai de garde
 * (MediaUploadService).
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(name = "media_uploads", indexes = {
    @Index(name = "idx_media_uploads_url", columnList = "url"),
    @Index(name = "idx_media_uploads_owner", columnList = "owner_id")
})
public class MediaUpload extends BaseEntity {

    // Le membre qui l'a envoyé. Son compte supprimé, le fichier reste à l'inventaire
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @ToString.Exclude
    private Developer owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UploadPurpose purpose;

    // Chemin dans le stockage : « projects/12/2026/10/3f2a….webp »
    @Column(nullable = false, unique = true, length = 300)
    private String storageKey;

    // Adresse publique, telle que les contenus l'écrivent
    @Column(nullable = false, length = 500)
    private String url;

    @Column(nullable = false, length = 50)
    private String contentType;

    // Taille en octets
    @Column(nullable = false)
    private long size;

    // Le projet qui montre l'image (couverture, miniature, galerie) ; null tant qu'aucun ne la montre. Le projet
    // supprimé, l'image n'est plus montrée : elle sera supprimée à son tour
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @ToString.Exclude
    private Project project;
}
