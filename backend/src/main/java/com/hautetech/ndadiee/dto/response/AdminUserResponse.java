package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.user.Role;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Un compte vu du back-office : identité, rôle, état, activité. */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AdminUserResponse {

    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String avatarUrl;
    private Role role;

    // "developer" ou "admin"
    private String userType;

    // Profil développeur : null pour un compte Admin
    private String country;
    private Integer reputation;

    private Instant createdAt;
    private Instant lastLoginAt;

    private boolean blocked;
    private Instant blockedAt;
    private String blockedReason;

    // Ce qu'il a publié, masqué ou non
    private long questionCount;
    private long answerCount;
    private long projectCount;
}
