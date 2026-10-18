package com.hautetech.ndadiee.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.content.ArticleStatus;
import com.hautetech.ndadiee.model.user.Developer;

public interface DeveloperRepository extends JpaRepository<Developer, Long>, JpaSpecificationExecutor<Developer> {

    Optional<Developer> findByUsername(String username);

    // Membres actifs : les comptes suspendus par l'administration ne comptent plus dans la communauté
    long countByBlockedAtIsNull();

    // ─── Back-office ───

    long countByCreatedAtGreaterThanEqual(Instant since);

    long countByLastLoginAtGreaterThanEqual(Instant since);

    // Dates d'inscription depuis cette date : la courbe des inscriptions, jour par jour
    @Query("SELECT d.createdAt FROM Developer d WHERE d.createdAt >= :since")
    List<Instant> findCreationDatesSince(@Param("since") Instant since);

    // Pays représentés dans la communauté
    @Query("SELECT COUNT(DISTINCT d.country) FROM Developer d WHERE d.country IS NOT NULL")
    long countCountries();

    @Query(value = "SELECT f FROM Developer d JOIN d.followers f WHERE d.id = :developerId ORDER BY f.reputation DESC, f.id ASC",
            countQuery = "SELECT COUNT(f) FROM Developer d JOIN d.followers f WHERE d.id = :developerId")
    Page<Developer> findFollowers(@Param("developerId") Long developerId, Pageable pageable);

    @Query(value = "SELECT f FROM Developer d JOIN d.following f WHERE d.id = :developerId ORDER BY f.reputation DESC, f.id ASC",
            countQuery = "SELECT COUNT(f) FROM Developer d JOIN d.following f WHERE d.id = :developerId")
    Page<Developer> findFollowing(@Param("developerId") Long developerId, Pageable pageable);

    @Query("SELECT COUNT(f) FROM Developer d JOIN d.followers f WHERE d.id = :developerId")
    long countFollowers(@Param("developerId") Long developerId);

    @Query("SELECT COUNT(f) FROM Developer d JOIN d.following f WHERE d.id = :developerId")
    long countFollowing(@Param("developerId") Long developerId);

    @Query("SELECT COUNT(f) > 0 FROM Developer d JOIN d.following f WHERE d.id = :followerId AND f.id = :followedId")
    boolean isFollowing(@Param("followerId") Long followerId, @Param("followedId") Long followedId);

    @Query("SELECT f.id FROM Developer d JOIN d.following f WHERE d.id = :developerId")
    List<Long> findFollowingIds(@Param("developerId") Long developerId);

    @Query("SELECT t.id FROM Developer d JOIN d.followedTags t WHERE d.id = :developerId")
    List<Long> findFollowedTagIds(@Param("developerId") Long developerId);

    @Query("SELECT COUNT(t) > 0 FROM Developer d JOIN d.followedTags t WHERE d.id = :developerId AND t.id = :tagId")
    boolean isFollowingTag(@Param("developerId") Long developerId, @Param("tagId") Long tagId);

    /**
     * Ce qu'un membre a fait de visible depuis cette date, un instant par contribution (la carte de ses
     * contributions) : sujets, réponses et commentaires écrits, articles publiés, projets lancés, notes de devlog et
     * retours donnés. Rien de ce que l'administration a masqué, ni de ce qui touche un projet masqué.
     */
    @Query("""
            SELECT q.createdAt FROM Question q
            WHERE q.author.id = :developerId AND q.hiddenAt IS NULL AND q.createdAt >= :since
            UNION ALL
            SELECT a.createdAt FROM Answer a
            WHERE a.author.id = :developerId AND a.hiddenAt IS NULL AND a.createdAt >= :since
            UNION ALL
            SELECT c.createdAt FROM Comment c
            WHERE c.author.id = :developerId AND c.createdAt >= :since
            UNION ALL
            SELECT r.publishedAt FROM Article r
            WHERE r.author.id = :developerId AND r.status = :published AND r.publishedAt >= :since
            UNION ALL
            SELECT p.createdAt FROM Project p
            WHERE p.owner.id = :developerId AND p.hiddenAt IS NULL AND p.createdAt >= :since
            UNION ALL
            SELECT e.createdAt FROM DevlogEntry e
            WHERE e.author.id = :developerId AND e.project.hiddenAt IS NULL AND e.createdAt >= :since
            UNION ALL
            SELECT f.createdAt FROM Feedback f
            WHERE f.author.id = :developerId AND f.call.project.hiddenAt IS NULL AND f.createdAt >= :since
            """)
    List<Instant> findContributionDates(@Param("developerId") Long developerId, @Param("since") Instant since,
            @Param("published") ArticleStatus published);

    @Query("SELECT d.reputation FROM Developer d WHERE d.id = :developerId")
    int findReputation(@Param("developerId") Long developerId);

    // Mise à jour atomique : la réputation ne descend jamais sous 0
    @Modifying
    @Query("""
            UPDATE Developer d
            SET d.reputation = CASE WHEN d.reputation + :delta < 0 THEN 0 ELSE d.reputation + :delta END
            WHERE d.id = :developerId
            """)
    void addReputation(@Param("developerId") Long developerId, @Param("delta") int delta);
}
