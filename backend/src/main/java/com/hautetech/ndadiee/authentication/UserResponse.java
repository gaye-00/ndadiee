package com.hautetech.ndadiee.authentication;

import java.time.Instant;
import java.util.List;

import com.hautetech.ndadiee.dto.response.TagResponse;
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
public class UserResponse {

    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String avatarUrl;
    private Role role;

    // "developer" ou "admin"
    private String userType;
    private Language preferredLanguage;
    private Instant createdAt;

    // Profil développeur : null pour un compte Admin
    private String bio;
    private String country;
    private String city;
    private String githubUrl;
    private String linkedinUrl;
    private String websiteUrl;
    private Integer reputation;
    private ExperienceLevel level;
    private Boolean openToWork;
    private List<TagResponse> skills;
    private List<TagResponse> followedTags;
}
