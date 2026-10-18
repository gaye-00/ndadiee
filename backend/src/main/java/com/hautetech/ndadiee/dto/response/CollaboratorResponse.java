package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un membre avec qui le développeur a fait équipe : « A travaillé avec », sur son profil. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CollaboratorResponse {

    private UserSummaryResponse user;
    private long sharedProjectCount;
    // Les projets en commun les plus étoilés (deux au plus) : id, nom et slug seulement
    private List<ProjectBriefResponse> projects;
}
