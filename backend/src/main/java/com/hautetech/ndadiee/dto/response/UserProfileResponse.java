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
    private long projectCount;

    // Renseigné uniquement pour un membre connecté
    private Boolean followedByMe;

    private Instant createdAt;
}
