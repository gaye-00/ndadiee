package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.project.TeamRole;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProjectOpeningResponse {

    private Long id;
    private TeamRole role;
    private String title;
    private String description;
    private int seats;
    private Integer starterIssueNumber;
    private String starterIssueTitle;
    private boolean open;
    private Instant createdAt;

    // Renseigné dans la liste des annonces ; absent quand l'annonce est déjà dans son projet
    private ProjectBriefResponse project;
}
