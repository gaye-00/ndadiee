package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import com.hautetech.ndadiee.model.project.MemberStatus;
import com.hautetech.ndadiee.model.project.ProjectRole;
import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Un projet de l'atelier (« Mes projets », design 3B) : la place du membre dans l'équipe, l'équipe, ce qui
 * attend (candidatures, places à pourvoir, retours reçus), le pouls du dépôt et le prochain hackathon.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DashboardProjectResponse {

    private Long id;
    private String name;
    private String slug;
    private String tagline;
    private String coverThumbnailUrl;

    // Sa place : ACCEPTED (dans l'équipe) ou PENDING (sa candidature attend), son rôle et sa spécialité,
    // depuis quand ; et pour une candidature, l'intitulé du rôle visé
    private MemberStatus myStatus;
    private ProjectRole myRole;
    private TeamRole mySpecialty;
    private Instant joinedAt;
    private String appliedTo;

    // L'équipe acceptée, le porteur d'abord (5 au plus), et son effectif
    private List<UserSummaryResponse> team;
    private long memberCount;

    // Places des rôles ouverts ; candidatures en attente (0 s'il ne gère pas le projet) ; retours reçus
    // par les demandes ouvertes
    private long openSeats;
    private long pendingApplications;
    private long feedbackReceived;

    // Pull requests du projet qui attendent sa revue
    private long reviewRequests;

    // Le dépôt à la dernière synchronisation : commits des 12 dernières semaines (null sans relevé)
    private List<Integer> commitWeeks;
    private Integer commitsThisWeek;
    // Dernière version : celle du dépôt, sinon celle du devlog
    private String lastRelease;
    private Instant lastReleaseAt;

    // Hackathon à venir ou en cours où l'équipe est inscrite
    private HackathonBriefResponse hackathon;

    // Dernier signe de vie : commit, entrée du devlog, arrivée dans l'équipe
    private Instant lastActivityAt;
}
