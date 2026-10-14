package com.hautetech.ndadiee.service.content;

import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.response.PageResponse;
import com.hautetech.ndadiee.dto.response.TagResponse;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.mapper.TagMapper;
import com.hautetech.ndadiee.model.content.Tag;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.TagRepository;
import com.hautetech.ndadiee.service.SlugService;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;
    private final DeveloperRepository developerRepository;
    private final SlugService slugService;
    private final TagMapper tagMapper;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public PageResponse<TagResponse> search(String q, Pageable pageable) {
        Page<Tag> page = (q == null || q.isBlank())
                ? tagRepository.findAll(pageable)
                : tagRepository.findByNameContainingIgnoreCase(q.trim(), pageable);
        return PageResponse.from(page.map(tagMapper::toResponse));
    }

    @Transactional(readOnly = true)
    public TagResponse getBySlug(String slug, Long currentUserId) {
        Tag tag = findBySlugOrThrow(slug);
        TagResponse response = tagMapper.toResponse(tag);
        if (currentUserId != null) {
            response.setFollowedByMe(developerRepository.isFollowingTag(currentUserId, tag.getId()));
        }
        return response;
    }

    /**
     * Retrouve les tags correspondant aux noms saisis, en créant ceux qui n'existent pas encore.
     * Deux saisies qui donnent le même slug (« Spring Boot », « spring-boot ») désignent le même tag.
     */
    public Set<Tag> resolveTags(Collection<String> names) {
        if (names == null) {
            return new HashSet<>();
        }
        Map<String, String> nameBySlug = new LinkedHashMap<>();
        for (String name : names) {
            if (name != null && !name.isBlank()) {
                nameBySlug.putIfAbsent(slugService.toSlug(name), name.trim());
            }
        }

        Set<Tag> tags = new HashSet<>();
        nameBySlug.forEach((slug, name) -> tags.add(tagRepository.findBySlug(slug).orElseGet(() -> {
            Tag created = tagRepository.save(Tag.builder().name(name).slug(slug).build());
            log.info("[Tag] Créé - ID: {} - nom: {}", created.getId(), created.getName());
            return created;
        })));
        return tags;
    }

    /** Remplace les tags d'un contenu par ceux saisis, et tient les compteurs d'utilisation à jour. */
    public void replaceTags(Set<Tag> current, Collection<String> names) {
        Set<Tag> wanted = resolveTags(names);

        Set<Tag> removed = new HashSet<>(current);
        removed.removeAll(wanted);
        Set<Tag> added = new HashSet<>(wanted);
        added.removeAll(current);

        current.removeAll(removed);
        current.addAll(added);
        addUsage(added, 1);
        addUsage(removed, -1);
    }

    /** À appeler à la suppression d'un contenu : ses tags comptent une utilisation de moins. */
    public void releaseTags(Set<Tag> tags) {
        addUsage(tags, -1);
    }

    // ==================== HELPERS ====================

    public Tag findBySlugOrThrow(String slug) {
        return tagRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Tag", "slug", slug));
    }

    private void addUsage(Set<Tag> tags, int delta) {
        if (tags.isEmpty()) {
            return;
        }
        tagRepository.addUsage(tags.stream().map(Tag::getId).toList(), delta);
        // L'UPDATE est passé à côté des entités déjà chargées : on les relit pour que la
        // réponse renvoyée au client porte le compteur à jour
        tags.forEach(entityManager::refresh);
    }
}
