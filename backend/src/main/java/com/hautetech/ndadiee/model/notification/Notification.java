package com.hautetech.ndadiee.model.notification;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "notifications",
    indexes = {
        @Index(name = "idx_notifications_recipient_read", columnList = "recipient_id, is_read"),
        @Index(name = "idx_notifications_recipient_created_at", columnList = "recipient_id, created_at DESC")
    }
)
public class Notification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @ToString.Exclude
    private User recipient;

    // Auteur de l'action ; null pour les notifications système (BADGE_EARNED)
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @ToString.Exclude
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    /**
     * Contenu concerné. targetType reste null quand la cible n'est pas un contenu :
     * NEW_FOLLOWER (la cible est l'actor) et BADGE_EARNED (targetId = id du badge).
     */
    @Enumerated(EnumType.STRING)
    private ContentType targetType;

    private Long targetId;

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private boolean read = false;
}
