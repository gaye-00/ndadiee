package com.hautetech.ndadiee.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.content.Answer;

public interface AnswerRepository extends JpaRepository<Answer, Long> {

    // La réponse acceptée d'abord, puis les mieux notées
    Page<Answer> findByQuestionIdOrderByAcceptedDescScoreDescCreatedAtAsc(Long questionId, Pageable pageable);

    @Query("SELECT a.id FROM Answer a WHERE a.question.id = :questionId")
    List<Long> findIdsByQuestionId(@Param("questionId") Long questionId);

    long countByAuthorId(Long authorId);

    @Modifying
    @Query("UPDATE Answer a SET a.score = a.score + :delta WHERE a.id = :id")
    void addScore(@Param("id") Long id, @Param("delta") int delta);
}
