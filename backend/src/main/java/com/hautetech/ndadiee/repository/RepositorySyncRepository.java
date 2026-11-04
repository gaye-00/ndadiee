package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hautetech.ndadiee.model.review.RepositorySync;

public interface RepositorySyncRepository extends JpaRepository<RepositorySync, Long> {

    Optional<RepositorySync> findByProjectId(Long projectId);

    List<RepositorySync> findByProjectIdIn(Collection<Long> projectIds);
}
