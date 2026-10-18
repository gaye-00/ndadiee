package com.hautetech.ndadiee.repository;

import java.time.Instant;
import java.util.Collection;
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

    // Les chiffres publics ne comptent que les sujets visibles : un sujet masqué par l'administration n'existe
    // plus pour le public
    long countByAuthorIdAndHiddenAtIsNull(Long authorId);

    long countByHiddenAtIsNull();

    long countByHiddenAtIsNotNull();

    long countByAcceptedAnswerIsNotNullAndHiddenAtIsNull();

    long countByAnswerCountAndHiddenAtIsNull(int answerCount);

    // Nouveaux sujets depuis cette date (back-office)
    long countByCreatedAtGreaterThanEqual(Instant since);

    // [auteur, nombre de sujets] pour ces membres (back-office : une requête pour toute la page)
    @Query("SELECT q.author.id, COUNT(q) FROM Question q WHERE q.author.id IN :authorIds GROUP BY q.author.id")
    List<Object[]> countByAuthors(@Param("authorIds") Collection<Long> authorIds);

    // Les tags du forum, du plus utilisé au moins utilisé : [slug, nom, nombre de sujets visibles]
    @Query("""
            SELECT t.slug, t.name, COUNT(q) FROM Question q JOIN q.tags t
            WHERE q.hiddenAt IS NULL
            GROUP BY t.id, t.slug, t.name
            ORDER BY COUNT(q) DESC, t.name ASC
            """)
    List<Object[]> countTopicsByTag(Pageable pageable);

    // Membres qui ont publié au moins un sujet ou une réponse visibles
    @Query("""
            SELECT COUNT(d) FROM Developer d
            WHERE EXISTS (SELECT 1 FROM Question q WHERE q.author = d AND q.hiddenAt IS NULL)
               OR EXISTS (SELECT 1 FROM Answer a WHERE a.author = d AND a.hiddenAt IS NULL AND a.question.hiddenAt IS NULL)
            """)
    long countContributors();

    // Les compteurs passent par des UPDATE atomiques : pas de vote perdu en cas d'accès
    // concurrents, et updatedAt (date de dernière modification du contenu) n'est pas touché. Un sujet masqué
    // ne compte pas de vues : seuls son auteur et les admins l'ouvrent encore.
    @Modifying
    @Query("UPDATE Question q SET q.viewCount = q.viewCount + 1 WHERE q.slug = :slug AND q.hiddenAt IS NULL")
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
