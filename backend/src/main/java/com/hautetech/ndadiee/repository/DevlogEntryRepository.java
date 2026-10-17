package com.hautetech.ndadiee.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.hautetech.ndadiee.model.project.DevlogEntry;

public interface DevlogEntryRepository extends JpaRepository<DevlogEntry, Long> {

    @EntityGraph(attributePaths = "author")
    Page<DevlogEntry> findByProjectId(Long projectId, Pageable pageable);
}
