package com.hautetech.ndadiee.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
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

    long countByAcceptedAnswerIsNotNull();

    long countByAnswerCount(int answerCount);

    // Les tags du forum, du plus utilisé au moins utilisé : [slug, nom, nombre de sujets]
    @Query("""
            SELECT t.slug, t.name, COUNT(q) FROM Question q JOIN q.tags t
            GROUP BY t.id, t.slug, t.name
            ORDER BY COUNT(q) DESC, t.name ASC
            """)
    List<Object[]> countTopicsByTag(Pageable pageable);

    // Membres qui ont publié au moins un sujet ou une réponse
    @Query("""
            SELECT COUNT(d) FROM Developer d
            WHERE EXISTS (SELECT 1 FROM Question q WHERE q.author = d)
               OR EXISTS (SELECT 1 FROM Answer a WHERE a.author = d)
            """)
    long countContributors();

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
