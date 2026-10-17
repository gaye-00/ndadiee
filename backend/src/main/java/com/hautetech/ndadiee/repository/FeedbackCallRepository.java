package com.hautetech.ndadiee.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.hautetech.ndadiee.model.project.FeedbackCall;

public interface FeedbackCallRepository extends JpaRepository<FeedbackCall, Long> {

    // Demandes ouvertes d'un projet, les plus récentes d'abord
    @EntityGraph(attributePaths = "author")
    List<FeedbackCall> findByProjectIdAndOpenTrueOrderByCreatedAtDescIdDesc(Long projectId);
}
