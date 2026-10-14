package com.hautetech.ndadiee.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.content.Article;
import com.hautetech.ndadiee.model.content.ArticleStatus;

public interface ArticleRepository extends JpaRepository<Article, Long>, JpaSpecificationExecutor<Article> {

    Optional<Article> findBySlug(String slug);

    boolean existsBySlug(String slug);

    long countByAuthorIdAndStatus(Long authorId, ArticleStatus status);

    @Modifying
    @Query("UPDATE Article a SET a.viewCount = a.viewCount + 1 WHERE a.slug = :slug AND a.status = com.hautetech.ndadiee.model.content.ArticleStatus.PUBLISHED")
    int incrementViewCount(@Param("slug") String slug);

    @Modifying
    @Query("UPDATE Article a SET a.score = a.score + :delta WHERE a.id = :id")
    void addScore(@Param("id") Long id, @Param("delta") int delta);
}
