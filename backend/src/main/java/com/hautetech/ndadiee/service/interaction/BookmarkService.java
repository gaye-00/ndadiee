package com.hautetech.ndadiee.service.interaction;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.dto.response.BookmarkResponse;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.repository.BookmarkRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Liste de lecture : les sujets du forum qu'un membre enregistre pour y revenir. Enregistrer et retirer sont
 * idempotents : le même geste répété (double clic, deux onglets) donne le même résultat, sans erreur.
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final QuestionRepository questionRepository;
    private final UserService userService;

    public BookmarkResponse save(Long userId, Long questionId) {
        // Un compte développeur seulement : un admin n'a pas de liste de lecture
        userService.getDeveloperOrThrow(userId);
        requireQuestion(questionId);
        if (bookmarkRepository.insertIfAbsent(userId, questionId) > 0) {
            log.info("[Bookmark] Membre {} : sujet {} enregistré", userId, questionId);
        }
        return toResponse(userId, questionId, true);
    }

    public BookmarkResponse remove(Long userId, Long questionId) {
        requireQuestion(questionId);
        if (bookmarkRepository.deleteByUserAndQuestion(userId, questionId) > 0) {
            log.info("[Bookmark] Membre {} : sujet {} retiré de sa liste", userId, questionId);
        }
        return toResponse(userId, questionId, false);
    }

    /** Le membre a-t-il enregistré ce sujet ? null pour un visiteur anonyme. */
    @Transactional(readOnly = true)
    public Boolean isBookmarked(Long userId, Long questionId) {
        return userId == null ? null : bookmarkRepository.existsByUserIdAndQuestionId(userId, questionId);
    }

    /** Parmi ces sujets, ceux que le membre a enregistrés. Vide pour un visiteur anonyme. */
    @Transactional(readOnly = true)
    public Set<Long> bookmarkedIds(Long userId, Collection<Long> questionIds) {
        if (userId == null || questionIds.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(bookmarkRepository.findBookmarkedQuestionIds(userId, questionIds));
    }

    // ==================== HELPERS ====================

    private void requireQuestion(Long questionId) {
        if (!questionRepository.existsById(questionId)) {
            throw new ResourceNotFoundException("Question", questionId);
        }
    }

    private BookmarkResponse toResponse(Long userId, Long questionId, boolean bookmarked) {
        return BookmarkResponse.builder()
                .questionId(questionId)
                .bookmarked(bookmarked)
                .savedCount(bookmarkRepository.countByUserId(userId))
                .build();
    }
}
