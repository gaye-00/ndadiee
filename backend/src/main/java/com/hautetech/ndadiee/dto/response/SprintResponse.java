package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un sprint de l'équipe : « Sprint 7 · Notifications de départ », son échéance et son avancement. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SprintResponse {

    private Long id;
    private int number;
    private String goal;
    private Instant startsAt;
    private Instant endsAt;
    private Instant closedAt;
    // En cours : les tâches du tableau, et celles qui sont terminées. Clos : les tâches livrées, deux fois.
    private long taskCount;
    private long doneCount;
}
