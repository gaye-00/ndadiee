package com.hautetech.ndadiee.dto.response;

import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * La plateforme en chiffres, pour l'accueil du back-office. « Récents » : les 7 derniers jours. Les contenus
 * comptent aussi ceux qui sont masqués ({@code hiddenContent} dit combien).
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AdminOverviewResponse {

    // ─── Membres de la communauté (comptes développeur) ───
    private long members;
    private long moderators;
    private long blockedMembers;
    private long newMembers;
    // Connectés au moins une fois ces 7 derniers jours
    private long activeMembers;

    // ─── Contenus ───
    private long topics;
    private long answers;
    private long projects;
    private long newTopics;
    private long newAnswers;
    private long newProjects;
    private long hiddenContent;

    // Inscriptions par jour (UTC), sur les 30 derniers jours, du plus ancien à aujourd'hui (jours vides compris)
    private List<DailyCount> signups;

    // Les dernières décisions de l'administration
    private List<AdminActionResponse> recentActions;

    public record DailyCount(LocalDate date, long count) {
    }
}
