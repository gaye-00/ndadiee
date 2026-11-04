package com.hautetech.ndadiee.model.admin;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.user.User;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

/**
 * Une ligne du journal de l'administration : qui a fait quoi, sur quoi, et pourquoi. Le journal ne s'efface
 * pas : la cible peut avoir été supprimée depuis, son libellé (nom d'utilisateur, titre) est donc gardé tel
 * qu'il était au moment de l'action.
 */
@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "admin_actions",
    indexes = {
        @Index(name = "idx_admin_actions_created_at", columnList = "created_at DESC"),
        @Index(name = "idx_admin_actions_target", columnList = "target_type, target_id")
    }
)
public class AdminAction extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.SET_NULL)
    @ToString.Exclude
    private User admin;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AdminActionType action;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AdminTargetType targetType;

    @Column(nullable = false)
    private Long targetId;

    // « @samuel_ngono », « Spring Boot : quelle différence entre… »
    @Column(nullable = false)
    private String targetLabel;

    @Column(length = 500)
    private String reason;

    // Précision de l'action : « USER → MODERATOR » pour un changement de rôle
    private String detail;
}
