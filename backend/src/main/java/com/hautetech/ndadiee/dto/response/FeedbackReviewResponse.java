package com.hautetech.ndadiee.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Une demande de retours d'un autre projet, où l'avis du membre compte (« revue communautaire ouverte »,
 * design 3B) : la demande, son projet, et pourquoi elle lui est proposée.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FeedbackReviewResponse {

    private ProjectBriefResponse project;
    private FeedbackCallResponse call;

    // Il a mis une étoile au projet ; technologies du projet qu'il a dans son profil
    private boolean starred;
    private List<String> sharedSkills;
}
