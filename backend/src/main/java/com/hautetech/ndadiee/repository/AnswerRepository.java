package com.hautetech.ndadiee.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.content.Answer;

public interface AnswerRepository extends JpaRepository<Answer, Long>, JpaSpecificationExecutor<Answer> {

    /**
     * Les réponses d'une question que ce lecteur peut voir, la réponse acceptée d'abord, puis les mieux notées. Une
     * réponse masquée par l'administration n'est montrée qu'à son auteur et aux admins ({@code admin}).
     */
    @Query(value = """
            SELECT a FROM Answer a
            WHERE a.question.id = :questionId
              AND (a.hiddenAt IS NULL OR :admin = true OR a.author.id = :viewerId)
            ORDER BY a.accepted DESC, a.score DESC, a.createdAt ASC
            """,
            countQuery = """
            SELECT COUNT(a) FROM Answer a
            WHERE a.question.id = :questionId
              AND (a.hiddenAt IS NULL OR :admin = true OR a.author.id = :viewerId)
            """)
    Page<Answer> findVisibleByQuestion(@Param("questionId") Long questionId, @Param("viewerId") Long viewerId,
            @Param("admin") boolean admin, Pageable pageable);

    @Query("SELECT a.id FROM Answer a WHERE a.question.id = :questionId")
    List<Long> findIdsByQuestionId(@Param("questionId") Long questionId);

    long countByAuthorIdAndHiddenAtIsNull(Long authorId);

    // Réponses acceptées par l'auteur du sujet, encore visibles (profil : preuves de travail)
    long countByAuthorIdAndAcceptedTrueAndHiddenAtIsNull(Long authorId);

    long countByHiddenAtIsNotNull();

    long countByCreatedAtGreaterThanEqual(Instant since);

    // Réponses visibles du forum : ni masquées, ni sous un sujet masqué
    @Query("SELECT COUNT(a) FROM Answer a WHERE a.hiddenAt IS NULL AND a.question.hiddenAt IS NULL")
    long countVisible();

    // [auteur, nombre de réponses] pour ces membres (back-office : une requête pour toute la page)
    @Query("SELECT a.author.id, COUNT(a) FROM Answer a WHERE a.author.id IN :authorIds GROUP BY a.author.id")
    List<Object[]> countByAuthors(@Param("authorIds") Collection<Long> authorIds);

    @Modifying
    @Query("UPDATE Answer a SET a.score = a.score + :delta WHERE a.id = :id")
    void addScore(@Param("id") Long id, @Param("delta") int delta);
}
