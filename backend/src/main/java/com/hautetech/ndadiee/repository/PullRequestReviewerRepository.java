package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.review.PullRequestReviewer;

public interface PullRequestReviewerRepository extends JpaRepository<PullRequestReviewer, Long> {

    Optional<PullRequestReviewer> findByPullRequestIdAndReviewerId(Long pullRequestId, Long reviewerId);

    // Relecteurs de plusieurs PR en une requête, relecteur chargé : les requis d'abord, puis dans l'ordre des demandes
    @Query("""
            SELECT r FROM PullRequestReviewer r JOIN FETCH r.reviewer
            WHERE r.pullRequest.id IN :ids
            ORDER BY r.required DESC, r.createdAt ASC, r.id ASC
            """)
    List<PullRequestReviewer> findWithReviewerByPullRequestIds(@Param("ids") Collection<Long> pullRequestIds);
}
