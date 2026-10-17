package com.hautetech.ndadiee.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.user.Developer;

public interface DeveloperRepository extends JpaRepository<Developer, Long>, JpaSpecificationExecutor<Developer> {

    Optional<Developer> findByUsername(String username);

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
