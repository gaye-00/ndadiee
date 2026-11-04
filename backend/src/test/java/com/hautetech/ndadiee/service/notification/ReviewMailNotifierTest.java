package com.hautetech.ndadiee.service.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.hautetech.ndadiee.event.ReviewActivityEvent;
import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.EmailSender;
import com.hautetech.ndadiee.mail.MailQueue;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.ReviewComment;
import com.hautetech.ndadiee.model.review.ReviewState;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.repository.PullRequestRepository;
import com.hautetech.ndadiee.repository.ReviewCommentRepository;
import com.hautetech.ndadiee.repository.UserRepository;
import com.hautetech.ndadiee.service.notification.ReviewMail.Reason;

/**
 * Qui est prévenu de quoi : l'auteur de la PR et ceux de la discussion pour un commentaire, l'auteur pour un verdict
 * ou une proposition de relecture, le relecteur pour une revue jugée utile. Jamais celui qui a fait le geste, ni qui a
 * coupé ces e-mails, ni un compte suspendu.
 */
@ExtendWith(MockitoExtension.class)
class ReviewMailNotifierTest {

    private static final Long PR_ID = 84L;

    @Mock
    private MailQueue queue;
    @Mock
    private EmailSender sender;
    @Mock
    private ReviewMailComposer composer;
    @Mock
    private PullRequestRepository pullRequestRepository;
    @Mock
    private ReviewCommentRepository commentRepository;
    @Mock
    private UserRepository userRepository;

    private ReviewMailNotifier notifier;
    private final Developer ama = developer(1L, "Ama");
    private final Developer chinedu = developer(2L, "Chinedu");
    private final Developer wanjiru = developer(3L, "Wanjiru");
    private final Developer kwame = developer(4L, "Kwame");
    private PullRequest pullRequest;

    private static Developer developer(Long id, String name) {
        return Developer.builder().id(id).fullName(name).email(name.toLowerCase() + "@example.com").build();
    }

    @BeforeEach
    void setUp() {
        notifier = new ReviewMailNotifier(queue, sender, composer, pullRequestRepository, commentRepository, userRepository,
                new TransactionTemplate(mock(PlatformTransactionManager.class)));
        pullRequest = PullRequest.builder().id(PR_ID).number(84).title("Cache Redis").author(ama)
                .project(Project.builder().name("Lagos Transit").slug("lagos-transit").build()).build();
        lenient().when(pullRequestRepository.findById(PR_ID)).thenReturn(Optional.of(pullRequest));
        Map<Long, Developer> people = Stream.of(ama, chinedu, wanjiru, kwame).collect(Collectors.toMap(Developer::getId, Function.identity()));
        lenient().when(userRepository.findById(any())).thenAnswer(call -> Optional.ofNullable(people.get(call.<Long>getArgument(0))));
        lenient().when(userRepository.findAllById(any())).thenAnswer(call -> call.<Collection<Long>>getArgument(0).stream()
                .map(people::get).filter(user -> user != null).map(User.class::cast).toList());
        lenient().when(composer.compose(any())).thenAnswer(call -> {
            ReviewMail mail = call.getArgument(0);
            return new EmailMessage(mail.recipient().getId(), mail.recipient().getEmail(), mail.reason().name(), "", "", "test");
        });
    }

    private Map<Long, String> recipientsOf(ReviewActivityEvent event) {
        return notifier.compose(event).stream().collect(Collectors.toMap(EmailMessage::recipientId, EmailMessage::subject));
    }

    @Test
    void aLineCommentReachesTheAuthorAndTheThreadButNotItsWriter() {
        ReviewComment reply = ReviewComment.builder().id(9L).pullRequest(pullRequest).author(chinedu).body("Bien vu").path("cache.go").line(24).build();
        when(commentRepository.findById(9L)).thenReturn(Optional.of(reply));
        when(commentRepository.findThreadAuthorIds(PR_ID, "cache.go", 24)).thenReturn(List.of(chinedu.getId(), wanjiru.getId(), ama.getId()));

        assertThat(recipientsOf(ReviewActivityEvent.commented(PR_ID, chinedu.getId(), 9L)))
                .containsExactlyInAnyOrderEntriesOf(Map.of(ama.getId(), Reason.AUTHOR.name(), wanjiru.getId(), Reason.PARTICIPANT.name()));
    }

    @Test
    void aConversationCommentReachesThoseWhoWroteInTheConversation() {
        ReviewComment comment = ReviewComment.builder().id(9L).pullRequest(pullRequest).author(ama).body("Merci à tous").build();
        when(commentRepository.findById(9L)).thenReturn(Optional.of(comment));
        when(commentRepository.findConversationAuthorIds(PR_ID)).thenReturn(List.of(kwame.getId(), ama.getId()));

        assertThat(recipientsOf(ReviewActivityEvent.commented(PR_ID, ama.getId(), 9L))).containsOnlyKeys(kwame.getId());
    }

    @Test
    void membersWhoCutTheseEmailsOrAreSuspendedReceiveNothing() {
        wanjiru.setReviewEmails(false);
        kwame.setBlockedAt(Instant.now());
        ReviewComment reply = ReviewComment.builder().id(9L).pullRequest(pullRequest).author(chinedu).body("Ok").path("a.go").line(1).build();
        when(commentRepository.findById(9L)).thenReturn(Optional.of(reply));
        when(commentRepository.findThreadAuthorIds(PR_ID, "a.go", 1)).thenReturn(List.of(wanjiru.getId(), kwame.getId()));

        assertThat(recipientsOf(ReviewActivityEvent.commented(PR_ID, chinedu.getId(), 9L))).containsOnlyKeys(ama.getId());
    }

    @Test
    void aVerdictAndAClaimReachTheAuthorOnly() {
        ReviewComment verdict = ReviewComment.builder().id(10L).pullRequest(pullRequest).author(chinedu).verdict(ReviewState.APPROVED).build();
        when(commentRepository.findById(10L)).thenReturn(Optional.of(verdict));

        assertThat(recipientsOf(ReviewActivityEvent.reviewed(PR_ID, chinedu.getId(), 10L))).containsOnlyKeys(ama.getId());
        assertThat(recipientsOf(ReviewActivityEvent.claimed(PR_ID, wanjiru.getId()))).containsOnlyKeys(ama.getId());
    }

    @Test
    void aHelpfulReviewReachesItsReviewer() {
        assertThat(recipientsOf(ReviewActivityEvent.judgedHelpful(PR_ID, ama.getId(), wanjiru.getId())))
                .containsExactlyEntriesOf(Map.of(wanjiru.getId(), Reason.REVIEWER.name()));
    }

    @Test
    void aGithubAuthorWhoIsNotAMemberIsNotEmailed() {
        pullRequest.setAuthor(null);

        assertThat(recipientsOf(ReviewActivityEvent.claimed(PR_ID, wanjiru.getId()))).isEmpty();
    }

    @Test
    void aCommentDeletedMeanwhileAnnouncesNothing() {
        when(commentRepository.findById(9L)).thenReturn(Optional.empty());

        assertThat(notifier.compose(ReviewActivityEvent.commented(PR_ID, chinedu.getId(), 9L))).isEmpty();
    }

    @Test
    void emailsArePreparedAndSentOnTheMailQueue() {
        notifier.onReviewActivity(ReviewActivityEvent.claimed(PR_ID, wanjiru.getId()));

        ArgumentCaptor<Runnable> task = ArgumentCaptor.forClass(Runnable.class);
        verify(queue).submit(task.capture());
        verify(sender, never()).send(any());

        task.getValue().run();
        ArgumentCaptor<EmailMessage> sent = ArgumentCaptor.forClass(EmailMessage.class);
        verify(sender).send(sent.capture());
        assertThat(sent.getValue().to()).isEqualTo("ama@example.com");
    }
}
