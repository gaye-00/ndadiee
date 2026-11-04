package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.review.ReviewComment;

public interface ReviewCommentRepository extends JpaRepository<ReviewComment, Long> {

    // Commentaires de plusieurs PR en une requête : lignes [id de la PR, nombre]. Un verdict sans message n'est pas
    // un commentaire
    @Query("""
            SELECT c.pullRequest.id, COUNT(c) FROM ReviewComment c
            WHERE c.pullRequest.id IN :ids AND c.body IS NOT NULL GROUP BY c.pullRequest.id
            """)
    List<Object[]> countByPullRequestIds(@Param("ids") Collection<Long> pullRequestIds);

    // La conversation et les commentaires de ligne d'une PR, auteurs chargés : les plus anciens d'abord
    @Query("""
            SELECT c FROM ReviewComment c JOIN FETCH c.author
            WHERE c.pullRequest.id = :pullRequestId
            ORDER BY c.createdAt ASC, c.id ASC
            """)
    List<ReviewComment> findWithAuthorByPullRequestId(@Param("pullRequestId") Long pullRequestId);

    Optional<ReviewComment> findByIdAndPullRequestId(Long id, Long pullRequestId);

    // Ceux qui ont écrit dans la conversation d'une PR (hors commentaires de ligne et verdicts sans message)
    @Query("""
            SELECT DISTINCT c.author.id FROM ReviewComment c
            WHERE c.pullRequest.id = :pullRequestId AND c.path IS NULL AND c.body IS NOT NULL
            """)
    List<Long> findConversationAuthorIds(@Param("pullRequestId") Long pullRequestId);

    // Ceux qui ont écrit dans la discussion d'une ligne
    @Query("""
            SELECT DISTINCT c.author.id FROM ReviewComment c
            WHERE c.pullRequest.id = :pullRequestId AND c.path = :path AND c.line = :line
            """)
    List<Long> findThreadAuthorIds(@Param("pullRequestId") Long pullRequestId, @Param("path") String path, @Param("line") Integer line);
}
