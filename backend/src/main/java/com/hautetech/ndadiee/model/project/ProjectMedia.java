package com.hautetech.ndadiee.model.project;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import com.hautetech.ndadiee.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Image de la galerie d'un projet (design 3D : la capture principale et ses miniatures). La couverture
 * du projet ouvre la galerie ; ces images la suivent, dans l'ordre de leur rang.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(name = "project_media")
public class ProjectMedia extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private Project project;

    // Rang dans la galerie, à partir de 0
    @Column(nullable = false)
    private int position;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MediaKind kind;

    // Grande image (1280 px) et miniature (640 px). Adresse complète, ou chemin d'un média servi par
    // l'API (« media/... ») : voir MediaUrls.
    @Column(nullable = false, length = 500)
    private String url;

    @Column(length = 500)
    private String thumbnailUrl;

    // Ce que montre l'image : « Prochains passages à l'arrêt Obalende »
    @Column(length = 200)
    private String caption;

    // Image empruntée : auteur et licence, et lien vers sa source
    @Column(length = 200)
    private String credit;

    @Column(length = 500)
    private String sourceUrl;

    // Dimensions de la grande image : la page lui réserve sa place avant qu'elle n'arrive
    private Integer width;

    private Integer height;
}
