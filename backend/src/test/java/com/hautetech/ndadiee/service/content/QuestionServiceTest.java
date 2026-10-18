package com.hautetech.ndadiee.service.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;

import com.hautetech.ndadiee.dto.request.QuestionRequest;
import com.hautetech.ndadiee.dto.response.QuestionResponse;
import com.hautetech.ndadiee.exception.UnauthorizedException;
import com.hautetech.ndadiee.mapper.QuestionMapper;
import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.repository.AnswerRepository;
import com.hautetech.ndadiee.repository.BookmarkRepository;
import com.hautetech.ndadiee.repository.CommentRepository;
import com.hautetech.ndadiee.repository.DeveloperRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.repository.VoteRepository;
import com.hautetech.ndadiee.repository.specification.QuestionFilter;
import com.hautetech.ndadiee.service.SlugService;
import com.hautetech.ndadiee.service.interaction.BookmarkService;
import com.hautetech.ndadiee.service.interaction.VoteService;
import com.hautetech.ndadiee.service.user.UserService;

/** Sujets du forum : le fil d'un membre, les adresses réservées, le nettoyage à la suppression. */
@ExtendWith(MockitoExtension.class)
class QuestionServiceTest {

    private static final Long AUTHOR = 1L;
    private static final Long QUESTION_ID = 100L;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private AnswerRepository answerRepository;

    @Mock
    private VoteRepository voteRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private BookmarkRepository bookmarkRepository;

    @Mock
    private DeveloperRepository developerRepository;

    @Mock
    private UserService userService;

    @Mock
    private TagService tagService;

    @Spy
    private SlugService slugService = new SlugService();

    @Mock
    private VoteService voteService;

    @Mock
    private BookmarkService bookmarkService;

    @Mock
    private QuestionMapper questionMapper;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private QuestionService questionService;

    private static final QuestionFilter NO_FILTER = new QuestionFilter(null, null, null, null, null, null, null, null);

    @Test
    void aVisitorHasNoFeedOfTheirOwn() {
        assertThatThrownBy(() -> questionService.list(NO_FILTER, true, null, PageRequest.of(0, 20)))
                .isInstanceOf(UnauthorizedException.class);

        verifyNoInteractions(questionRepository);
    }

    @Test
    void aTopicNeverTakesAnAddressOfTheApplication() {
        // « New » donnerait /forum/new, la page du formulaire : le sujet prend « new-2 »
        when(userService.getDeveloperOrThrow(AUTHOR)).thenReturn(Developer.builder().id(AUTHOR).build());
        when(questionRepository.existsBySlug(anyString())).thenReturn(false);
        when(questionRepository.save(any(Question.class))).thenAnswer(call -> call.getArgument(0));
        when(questionMapper.toResponse(any(Question.class))).thenReturn(new QuestionResponse());

        questionService.create(AUTHOR, QuestionRequest.builder()
                .title("New")
                .body("Un contenu assez long pour être publié.")
                .tags(List.of("Java"))
                .build());

        ArgumentCaptor<Question> saved = ArgumentCaptor.forClass(Question.class);
        verify(questionRepository).save(saved.capture());
        assertThat(saved.getValue().getSlug()).isEqualTo("new-2");
    }

    @Test
    void deletingATopicEmptiesItFromReadingLists() {
        Question question = Question.builder()
                .id(QUESTION_ID)
                .title("Sujet")
                .author(Developer.builder().id(AUTHOR).build())
                .build();
        when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(question));
        when(answerRepository.findIdsByQuestionId(QUESTION_ID)).thenReturn(List.of());

        questionService.delete(AUTHOR, QUESTION_ID);

        verify(bookmarkRepository).deleteByQuestionId(QUESTION_ID);
        verify(questionRepository).delete(question);
    }
}
