package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.interaction.Vote;

public interface VoteRepository extends JpaRepository<Vote, Long> {

    Optional<Vote> findByUserIdAndTargetTypeAndTargetId(Long userId, ContentType targetType, Long targetId);

    // Votes d'un membre sur une liste de contenus (pour afficher son vote sur chaque élément)
    List<Vote> findByUserIdAndTargetTypeAndTargetIdIn(Long userId, ContentType targetType, Collection<Long> targetIds);

    // La cible est polymorphe (pas de clé étrangère) : le nettoyage se fait à la suppression du contenu
    @Modifying
    @Query("DELETE FROM Vote v WHERE v.targetType = :targetType AND v.targetId IN :targetIds")
    void deleteByTargets(@Param("targetType") ContentType targetType, @Param("targetIds") Collection<Long> targetIds);
}
