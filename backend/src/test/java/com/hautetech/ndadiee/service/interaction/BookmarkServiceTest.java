package com.hautetech.ndadiee.service.interaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.hautetech.ndadiee.dto.response.BookmarkResponse;
import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.repository.BookmarkRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.service.user.UserService;

/** Liste de lecture : enregistrer et retirer un sujet, sans erreur quand le geste est répété. */
@ExtendWith(MockitoExtension.class)
class BookmarkServiceTest {

    private static final Long MEMBER = 1L;
    private static final Long QUESTION_ID = 100L;

    @Mock
    private BookmarkRepository bookmarkRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private BookmarkService bookmarkService;

    @Test
    void savingAQuestionPutsItInTheReadingList() {
        when(questionRepository.existsById(QUESTION_ID)).thenReturn(true);
        when(bookmarkRepository.insertIfAbsent(MEMBER, QUESTION_ID)).thenReturn(1);
        when(bookmarkRepository.countByUserId(MEMBER)).thenReturn(3L);

        BookmarkResponse response = bookmarkService.save(MEMBER, QUESTION_ID);

        assertThat(response.isBookmarked()).isTrue();
        assertThat(response.getQuestionId()).isEqualTo(QUESTION_ID);
        assertThat(response.getSavedCount()).isEqualTo(3L);
        verify(userService).getDeveloperOrThrow(MEMBER);
    }

    @Test
    void savingTwiceIsHarmless() {
        when(questionRepository.existsById(QUESTION_ID)).thenReturn(true);
        // Déjà dans la liste : l'insertion ne fait rien, la réponse est la même
        when(bookmarkRepository.insertIfAbsent(MEMBER, QUESTION_ID)).thenReturn(0);

        assertThat(bookmarkService.save(MEMBER, QUESTION_ID).isBookmarked()).isTrue();
    }

    @Test
    void anUnknownQuestionCannotBeSaved() {
        when(questionRepository.existsById(QUESTION_ID)).thenReturn(false);

        assertThatThrownBy(() -> bookmarkService.save(MEMBER, QUESTION_ID))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(bookmarkRepository, never()).insertIfAbsent(anyLong(), anyLong());
    }

    @Test
    void removingTakesItOutOfTheReadingList() {
        when(questionRepository.existsById(QUESTION_ID)).thenReturn(true);

        BookmarkResponse response = bookmarkService.remove(MEMBER, QUESTION_ID);

        assertThat(response.isBookmarked()).isFalse();
        verify(bookmarkRepository).deleteByUserAndQuestion(MEMBER, QUESTION_ID);
    }

    @Test
    void aVisitorHasNoReadingList() {
        assertThat(bookmarkService.isBookmarked(null, QUESTION_ID)).isNull();
        assertThat(bookmarkService.bookmarkedIds(null, List.of(QUESTION_ID))).isEmpty();
        verifyNoInteractions(bookmarkRepository);
    }

    @Test
    void aPageOfQuestionsIsCheckedInOneQuery() {
        when(bookmarkRepository.findBookmarkedQuestionIds(MEMBER, List.of(100L, 101L, 102L))).thenReturn(List.of(101L));

        Set<Long> bookmarked = bookmarkService.bookmarkedIds(MEMBER, List.of(100L, 101L, 102L));

        assertThat(bookmarked).containsExactly(101L);
    }
}
