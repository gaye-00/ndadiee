package com.hautetech.ndadiee.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.PullRequestStatus;

public interface PullRequestRepository extends JpaRepository<PullRequest, Long> {

    Optional<PullRequest> findByProjectIdAndNumber(Long projectId, int number);

    long countByProjectIdAndStatus(Long projectId, PullRequestStatus status);

    /**
     * Les PR qu'une tâche du projet peut livrer : les ouvertes, puis celles qui ont bougé depuis {@code since} (fusionnées,
     * fermées), les plus récentes d'abord.
     */
    @Query("""
            SELECT pr FROM PullRequest pr
            WHERE pr.project.id = :projectId AND (pr.status = :open OR pr.lastActivityAt >= :since)
            ORDER BY CASE WHEN pr.status = :open THEN 0 ELSE 1 END, pr.number DESC
            """)
    List<PullRequest> findLinkable(@Param("projectId") Long projectId, @Param("open") PullRequestStatus open,
            @Param("since") Instant since, Pageable limit);

    List<PullRequest> findByProjectIdAndNumberIn(Long projectId, Collection<Integer> numbers);

    /** Les numéros des PR d'un projet venues de GitHub et ouvertes chez nous */
    @Query("SELECT pr.number FROM PullRequest pr WHERE pr.project.id = :projectId AND pr.githubUrl IS NOT NULL AND pr.status = :status")
    List<Integer> findSyncedNumbers(@Param("projectId") Long projectId, @Param("status") PullRequestStatus status);

    @Query("SELECT COUNT(pr) FROM PullRequest pr WHERE pr.project.id = :projectId AND pr.githubUrl IS NOT NULL AND pr.status = :status")
    long countSynced(@Param("projectId") Long projectId, @Param("status") PullRequestStatus status);

    /** Les PR venues d'un autre dépôt que celui du projet aujourd'hui (son adresse a changé), avec leurs revues */
    @Modifying
    @Query("DELETE FROM PullRequest pr WHERE pr.project.id = :projectId AND pr.githubUrl IS NOT NULL")
    int deleteSynced(@Param("projectId") Long projectId);
}
