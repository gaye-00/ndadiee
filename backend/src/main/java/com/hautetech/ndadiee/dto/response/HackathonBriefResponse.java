package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Hackathon résumé : celui auquel un projet est inscrit (page et cartes des projets). */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HackathonBriefResponse {

    private Long id;
    private String slug;
    private String title;
    private Instant startsAt;
    private Instant endsAt;
    private Instant registrationClosesAt;
}
