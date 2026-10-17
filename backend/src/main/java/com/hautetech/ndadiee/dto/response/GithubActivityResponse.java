package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Activité du dépôt GitHub d'un projet, à sa dernière synchronisation. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GithubActivityResponse {

    private int stars;
    private int forks;
    private int openIssues;
    // Issues « good first issue » ouvertes : les « premier pas »
    private int goodFirstIssues;
    private int contributors;
    private int commitsThisWeek;
    // Commits des 12 dernières semaines, de la plus ancienne à la semaine en cours
    private List<Integer> commitWeeks;
    private String lastRelease;
    private Instant lastReleaseAt;
    private Instant lastCommitAt;
    private Instant syncedAt;
}
