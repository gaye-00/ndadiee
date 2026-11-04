package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Une page de la discussion de l'équipe, et le rendez-vous épinglé en haut. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TeamChatResponse {

    // Du plus ancien au plus récent : dans l'ordre de lecture
    private List<TeamMessageResponse> messages;
    // Des messages plus anciens attendent : la page suivante se demande avec before = l'identifiant du premier
    private boolean hasMore;
    // Le prochain rendez-vous, ou celui en cours ; null s'il n'y en a pas
    private TeamMessageResponse nextEvent;
}
