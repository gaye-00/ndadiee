package com.hautetech.ndadiee.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** La communauté en chiffres (accueil) : développeurs, pays, projets, rôles ouverts et leurs places. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CommunityStatsResponse {

    private long developers;
    private long countries;
    private long projects;
    private long openings;
    private long seats;
}
