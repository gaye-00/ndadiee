package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un rendez-vous de l'équipe : quand, où se retrouver, et qui y sera. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TeamEventResponse {

    private Instant startsAt;
    private Instant endsAt;
    private String link;
    // Dans l'ordre des réponses
    private List<UserSummaryResponse> attendees;
    // Le membre connecté y sera
    private boolean attending;
}
