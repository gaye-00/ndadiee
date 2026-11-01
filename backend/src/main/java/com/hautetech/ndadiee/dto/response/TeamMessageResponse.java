package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.workspace.TeamMessageKind;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un message de la discussion de l'équipe, ou un rendez-vous (event). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TeamMessageResponse {

    private Long id;
    private TeamMessageKind kind;
    // Le message, ou le titre du rendez-vous
    private String body;
    private UserSummaryResponse author;
    private Instant createdAt;
    // Un rendez-vous seulement
    private TeamEventResponse event;
}
