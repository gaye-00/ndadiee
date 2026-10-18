package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.interaction.Bookmark;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    boolean existsByUserIdAndQuestionId(Long userId, Long questionId);

    // Enregistrer deux fois (double clic, deux onglets) ne fait rien : pas d'erreur de doublon à rattraper
    @Modifying
    @Query(value = """
            INSERT INTO bookmarks (user_id, question_id, created_at, updated_at)
            VALUES (:userId, :questionId, now(), now())
            ON CONFLICT (user_id, question_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("userId") Long userId, @Param("questionId") Long questionId);

    @Modifying
    @Query("DELETE FROM Bookmark b WHERE b.user.id = :userId AND b.question.id = :questionId")
    int deleteByUserAndQuestion(@Param("userId") Long userId, @Param("questionId") Long questionId);

    // Ceux d'une page de sujets que le membre a enregistrés (le marque-page plein sur la carte)
    @Query("SELECT b.question.id FROM Bookmark b WHERE b.user.id = :userId AND b.question.id IN :questionIds")
    List<Long> findBookmarkedQuestionIds(@Param("userId") Long userId, @Param("questionIds") Collection<Long> questionIds);

    // La liste de lecture : les derniers enregistrés d'abord. Un sujet masqué par l'administration en sort (il y
    // revient s'il est rétabli).
    @Query(value = """
            SELECT b.question FROM Bookmark b
            WHERE b.user.id = :userId AND b.question.hiddenAt IS NULL
            ORDER BY b.createdAt DESC, b.id DESC
            """,
            countQuery = "SELECT COUNT(b) FROM Bookmark b WHERE b.user.id = :userId AND b.question.hiddenAt IS NULL")
    Page<Question> findSavedQuestions(@Param("userId") Long userId, Pageable pageable);

    // Taille de la liste de lecture : les sujets masqués par l'administration n'y comptent pas
    @Query("SELECT COUNT(b) FROM Bookmark b WHERE b.user.id = :userId AND b.question.hiddenAt IS NULL")
    long countByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM Bookmark b WHERE b.question.id = :questionId")
    void deleteByQuestionId(@Param("questionId") Long questionId);
}
