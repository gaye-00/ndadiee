package com.hautetech.ndadiee.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hautetech.ndadiee.model.badge.Badge;

public interface BadgeRepository extends JpaRepository<Badge, Long> {

    Optional<Badge> findByName(String name);

    List<Badge> findAllByOrderByIdAsc();
}
