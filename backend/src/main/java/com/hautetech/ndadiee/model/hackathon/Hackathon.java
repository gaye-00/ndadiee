package com.hautetech.ndadiee.model.hackathon;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.hibernate.annotations.DynamicUpdate;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.model.opportunity.WorkMode;
import com.hautetech.ndadiee.model.user.User;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Hackathon organisé sur la plateforme : un thème, des dates, un lieu (ou en ligne), une dotation.
 * Une équipe est un projet inscrit (HackathonTeam) : ses membres et ses rôles recherchés sont ceux
 * du projet. Le statut (à venir, en cours, terminé) se déduit des dates : voir HackathonStatus.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@DynamicUpdate
@Table(name = "hackathons")
public class Hackathon extends BaseEntity {

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, unique = true, length = 140)
    private String slug;

    // Accroche d'une ligne, pour les cartes
    @Column(length = 200)
    private String tagline;

    // Markdown
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 150)
    private String organizerName;

    // En ligne, sur place ou les deux
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkMode format;

    // Code pays ISO 3166-1 alpha-2 et ville : vides pour un hackathon entièrement en ligne
    @Column(length = 2)
    private String country;

    @Column(length = 100)
    private String city;

    // Fuseau horaire de l'événement (IANA, « Africa/Abidjan ») : sur place, les horaires s'y lisent
    @Column(nullable = false, length = 40)
    private String timezone;

    @Column(nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private Instant endsAt;

    // Au plus tard le coup d'envoi
    @Column(nullable = false)
    private Instant registrationClosesAt;

    // Texte libre : « 5 000 000 FCFA »
    @Column(length = 100)
    private String prizePool;

    // Membres acceptés d'un projet inscrit
    @Builder.Default
    @Column(nullable = false)
    private int minTeamSize = 2;

    @Builder.Default
    @Column(nullable = false)
    private int maxTeamSize = 5;

    // Équipes acceptées au plus ; vide : pas de limite
    private Integer maxTeams;

    // Thèmes et technologies
    @ManyToMany
    @JoinTable(
        name = "hackathon_tags",
        joinColumns = @JoinColumn(name = "hackathon_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @ToString.Exclude
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();

    // User et non Developer : l'équipe de la plateforme (un Admin) organise aussi des hackathons
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private User createdBy;

    // Programme : les temps forts, dans l'ordre chronologique
    @ElementCollection
    @CollectionTable(name = "hackathon_milestones", joinColumns = @JoinColumn(name = "hackathon_id"))
    @OrderBy("scheduledAt ASC")
    @ToString.Exclude
    @Builder.Default
    private List<HackathonMilestone> schedule = new ArrayList<>();

    // Prix, dans l'ordre où l'organisateur les présente
    @ElementCollection
    @CollectionTable(name = "hackathon_prizes", joinColumns = @JoinColumn(name = "hackathon_id"))
    @OrderColumn(name = "position")
    @ToString.Exclude
    @Builder.Default
    private List<HackathonPrize> prizes = new ArrayList<>();

    @OneToMany(mappedBy = "hackathon", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @Builder.Default
    private List<HackathonTeam> teams = new ArrayList<>();
}
