package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Un événement dans une équipe du membre (« Dans tes équipes », design 3B) : qui, dans quel projet, quoi.
 * Dérivé des données du projet (devlog, équipe, annonces, retours, hackathons) : rien n'est stocké à part.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TeamActivityResponse {

    public enum Type {
        // Une entrée du devlog ; RELEASE quand elle porte une version
        DEVLOG,
        RELEASE,
        // Arrivée dans l'équipe
        MEMBER_JOINED,
        // Candidature reçue : seulement pour qui gère le projet
        APPLICATION,
        // Rôle publié
        OPENING_PUBLISHED,
        // Demande de retours ouverte, et avis reçu
        FEEDBACK_REQUESTED,
        FEEDBACK_GIVEN,
        // Inscription à un hackathon
        HACKATHON_REGISTERED,
        // Pull request ouverte, fusionnée ; revue rendue avec un verdict
        PR_OPENED,
        PR_MERGED,
        PR_APPROVED,
        PR_CHANGES_REQUESTED
    }

    // Identifiant stable dans le fil : type et identifiant de la ligne d'origine (« DEVLOG-42 »)
    private String key;
    private Type type;
    private Instant at;

    private UserSummaryResponse actor;
    private ProjectBriefResponse project;

    // Événements du même genre regroupés (avis sur une même demande, rôles publiés le même jour) : combien,
    // et d'autres auteurs que le plus récent (3 au plus)
    private int count;
    private List<UserSummaryResponse> others;

    // Selon le type : version, intitulé du rôle ou de la demande, titre du hackathon ; puis texte (devlog,
    // avis), note de l'avis, rôle de l'équipe ; slug du hackathon
    private String subject;
    private String body;
    private Integer rating;
    private TeamRole role;
    private String hackathonSlug;
    // Le numéro d'une pull request : « #84 »
    private Integer number;
}
