package com.hautetech.ndadiee.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.content.Question;

public interface QuestionRepository extends JpaRepository<Question, Long>, JpaSpecificationExecutor<Question> {

    Optional<Question> findBySlug(String slug);

    boolean existsBySlug(String slug);

    long countByAuthorId(Long authorId);

    // Les compteurs passent par des UPDATE atomiques : pas de vote perdu en cas d'accès
    // concurrents, et updatedAt (date de dernière modification du contenu) n'est pas touché.
    @Modifying
    @Query("UPDATE Question q SET q.viewCount = q.viewCount + 1 WHERE q.slug = :slug")
    int incrementViewCount(@Param("slug") String slug);

    @Modifying
    @Query("UPDATE Question q SET q.score = q.score + :delta WHERE q.id = :id")
    void addScore(@Param("id") Long id, @Param("delta") int delta);

    @Modifying
    @Query("""
            UPDATE Question q
            SET q.answerCount = CASE WHEN q.answerCount + :delta < 0 THEN 0 ELSE q.answerCount + :delta END
            WHERE q.id = :id
            """)
    void addAnswerCount(@Param("id") Long id, @Param("delta") int delta);
}
