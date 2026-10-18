package com.hautetech.ndadiee.dto.response;

import java.time.Instant;
import java.util.List;

import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.user.ExperienceLevel;
import com.hautetech.ndadiee.model.user.Role;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserProfileResponse {

    private Long id;
    private String username;
    private String fullName;
    private String avatarUrl;
    private String bio;
    private String country;
    private String city;
    private Language preferredLanguage;
    private String githubUrl;
    private String linkedinUrl;
    private String websiteUrl;
    private Role role;
    private int reputation;
    private ExperienceLevel level;
    private boolean openToWork;
    private List<TagResponse> skills;
    private List<UserBadgeResponse> badges;

    private long followersCount;
    private long followingCount;
    private long questionCount;
    private long answerCount;
    private long articleCount;
    // Projets lancés (dont il est le porteur)
    private long projectCount;

    // Preuves de travail : équipes rejointes (hors de ses projets), réponses acceptées, hackathons commencés où il
    // avait une équipe, et places sur un podium. Comme les autres chiffres, seulement ce que le public peut voir.
    private long teamCount;
    private long acceptedAnswerCount;
    private long hackathonCount;
    private long podiumCount;

    // Renseigné uniquement pour un membre connecté
    private Boolean followedByMe;

    private Instant createdAt;
}
