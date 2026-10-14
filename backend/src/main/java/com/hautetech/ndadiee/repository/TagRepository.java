package com.hautetech.ndadiee.repository;

import java.util.Collection;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.hautetech.ndadiee.model.content.Tag;

public interface TagRepository extends JpaRepository<Tag, Long> {

    Optional<Tag> findBySlug(String slug);

    Page<Tag> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @Modifying
    @Query("""
            UPDATE Tag t
            SET t.usageCount = CASE WHEN t.usageCount + :delta < 0 THEN 0 ELSE t.usageCount + :delta END
            WHERE t.id IN :ids
            """)
    void addUsage(@Param("ids") Collection<Long> ids, @Param("delta") int delta);
}
