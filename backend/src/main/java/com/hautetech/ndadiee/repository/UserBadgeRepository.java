package com.hautetech.ndadiee.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.hautetech.ndadiee.model.badge.UserBadge;

public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {

    boolean existsByUserIdAndBadgeId(Long userId, Long badgeId);

    @EntityGraph(attributePaths = "badge")
    List<UserBadge> findByUserIdOrderByAwardedAtDesc(Long userId);
}
