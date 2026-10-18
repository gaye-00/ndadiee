package com.hautetech.ndadiee.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.hautetech.ndadiee.model.admin.AdminAction;
import com.hautetech.ndadiee.model.admin.AdminTargetType;

public interface AdminActionRepository extends JpaRepository<AdminAction, Long> {

    Page<AdminAction> findByTargetType(AdminTargetType targetType, Pageable pageable);

    // Les dernières décisions, pour l'accueil du back-office
    List<AdminAction> findTop6ByOrderByCreatedAtDescIdDesc();
}
