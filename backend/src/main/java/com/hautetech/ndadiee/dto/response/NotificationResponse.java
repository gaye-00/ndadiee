package com.hautetech.ndadiee.dto.response;

import java.time.Instant;

import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.notification.NotificationType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class NotificationResponse {

    private Long id;
    private NotificationType type;

    // Auteur de l'action ; null pour les notifications système (BADGE_EARNED)
    private UserSummaryResponse actor;

    private ContentType targetType;
    private Long targetId;

    // De quoi construire le lien côté front : slug de la question/article/projet concerné
    // (pour une réponse : celui de sa question) et son titre ; nom du badge pour BADGE_EARNED
    private String targetSlug;
    private String targetTitle;

    private boolean read;
    private Instant createdAt;
}
