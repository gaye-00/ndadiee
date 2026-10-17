package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import com.hautetech.ndadiee.model.hackathon.HackathonStatus;
import com.hautetech.ndadiee.model.opportunity.WorkMode;
import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HackathonResponse {

    private Long id;
    private String slug;
    private String title;
    private String tagline;
    private String description;
    private String organizerName;
    private WorkMode format;
    private String country;
    private String city;
    // Fuseau de l'événement (IANA)
    private String timezone;
    private Instant startsAt;
    private Instant endsAt;
    private Instant registrationClosesAt;
    private String prizePool;
    private int minTeamSize;
    private int maxTeamSize;
    private Integer maxTeams;
    private List<TagResponse> tags;
    private List<HackathonMilestoneResponse> schedule;
    private List<HackathonPrizeResponse> prizes;

    // Renseignés par HackathonService, à l'heure de la réponse
    private HackathonStatus status;
    // Inscriptions pas encore closes, et des places pour une équipe de plus
    private boolean registrationOpen;
    private long teamCount;
    // Avant le coup d'envoi : places que les équipes cherchent encore à pourvoir (leurs rôles ouverts), et
    // ces rôles, dans l'ordre du catalogue ; ensuite 0 et vide
    private int openSeats;
    private List<TeamRole> rolesSought;
    // Les premières équipes : le palmarès d'abord, puis par ordre d'inscription (4 au plus)
    private List<HackathonTeamResponse> teams;

    // Renseigné uniquement pour un membre connecté : son équipe (un projet dont il est membre), avec ses
    // rôles ouverts avant le coup d'envoi
    private HackathonTeamResponse myTeam;

    private Instant createdAt;
}
