package com.hautetech.ndadiee.model.badge;

import java.time.Instant;

import com.hautetech.ndadiee.common.BaseEntity;
import com.hautetech.ndadiee.model.user.Developer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@EqualsAndHashCode(callSuper = true, onlyExplicitlyIncluded = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@Entity
@Table(
    name = "user_badges",
    uniqueConstraints = @UniqueConstraint(name = "uk_user_badges_user_badge", columnNames = {"user_id", "badge_id"})
)
public class UserBadge extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Developer user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @ToString.Exclude
    private Badge badge;

    @Builder.Default
    @Column(nullable = false)
    private Instant awardedAt = Instant.now();
}
