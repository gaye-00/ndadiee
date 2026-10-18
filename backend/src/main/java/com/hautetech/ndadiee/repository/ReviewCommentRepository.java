package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.review.ReviewComment;

public interface ReviewCommentRepository extends JpaRepository<ReviewComment, Long> {

    // Commentaires de plusieurs PR en une requête : lignes [id de la PR, nombre]
    @Query("""
            SELECT c.pullRequest.id, COUNT(c) FROM ReviewComment c
            WHERE c.pullRequest.id IN :ids GROUP BY c.pullRequest.id
            """)
    List<Object[]> countByPullRequestIds(@Param("ids") Collection<Long> pullRequestIds);
}
