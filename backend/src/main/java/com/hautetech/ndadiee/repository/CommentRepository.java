package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.interaction.Comment;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    Page<Comment> findByTargetTypeAndTargetIdOrderByCreatedAtAsc(ContentType targetType, Long targetId, Pageable pageable);

    // Les fils de plusieurs contenus d'un coup (les commentaires des réponses d'un sujet) : une seule requête
    List<Comment> findByTargetTypeAndTargetIdInOrderByCreatedAtAsc(ContentType targetType, Collection<Long> targetIds);

    // La cible est polymorphe (pas de clé étrangère) : le nettoyage se fait à la suppression du contenu
    @Modifying
    @Query("DELETE FROM Comment c WHERE c.targetType = :targetType AND c.targetId IN :targetIds")
    void deleteByTargets(@Param("targetType") ContentType targetType, @Param("targetIds") Collection<Long> targetIds);
}
