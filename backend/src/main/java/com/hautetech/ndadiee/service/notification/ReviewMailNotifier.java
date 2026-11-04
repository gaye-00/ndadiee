package com.hautetech.ndadiee.service.notification;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

import com.hautetech.ndadiee.event.ReviewActivityEvent;
import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.EmailSender;
import com.hautetech.ndadiee.mail.MailQueue;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.ReviewComment;
import com.hautetech.ndadiee.model.user.User;
import com.hautetech.ndadiee.repository.PullRequestRepository;
import com.hautetech.ndadiee.repository.ReviewCommentRepository;
import com.hautetech.ndadiee.repository.UserRepository;
import com.hautetech.ndadiee.service.notification.ReviewMail.Reason;
import com.hautetech.ndadiee.service.user.ReputationRules;

import lombok.extern.slf4j.Slf4j;

/**
 * Prévient par e-mail des gestes sur une revue de code (design 3C) :
 *
 * <ul>
 * <li>un commentaire : l'auteur de la PR, et ceux qui ont déjà écrit dans la même discussion (la même ligne, ou la
 * conversation) ;</li>
 * <li>une revue rendue, une proposition de relecture : l'auteur de la PR ;</li>
 * <li>une revue communautaire jugée utile : son relecteur, et la réputation qu'elle lui rapporte.</li>
 * </ul>
 *
 * Jamais celui qui a fait le geste, ni un membre qui a coupé ces e-mails, ni un compte suspendu. Rien ne part avant
 * que le geste soit enregistré (après la transaction), et tout se prépare sur la file des e-mails : la requête
 * n'attend pas. Hors production, l'EmailSender note seulement ce qui serait parti.
 */
@Slf4j
@Component
public class ReviewMailNotifier {

    private final MailQueue queue;
    private final EmailSender sender;
    private final ReviewMailComposer composer;
    private final PullRequestRepository pullRequestRepository;
    private final ReviewCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final TransactionTemplate transaction;

    @Autowired
    public ReviewMailNotifier(MailQueue queue, EmailSender sender, ReviewMailComposer composer, PullRequestRepository pullRequestRepository,
            ReviewCommentRepository commentRepository, UserRepository userRepository, PlatformTransactionManager transactionManager) {
        this(queue, sender, composer, pullRequestRepository, commentRepository, userRepository, readOnly(transactionManager));
    }

    // Pour les tests : une transaction donnée
    ReviewMailNotifier(MailQueue queue, EmailSender sender, ReviewMailComposer composer, PullRequestRepository pullRequestRepository,
            ReviewCommentRepository commentRepository, UserRepository userRepository, TransactionTemplate transaction) {
        this.queue = queue;
        this.sender = sender;
        this.composer = composer;
        this.pullRequestRepository = pullRequestRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.transaction = transaction;
    }

    private static TransactionTemplate readOnly(PlatformTransactionManager transactionManager) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setReadOnly(true);
        return template;
    }

    /** Le geste est enregistré : ses e-mails se préparent et partent sur la file des e-mails. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReviewActivity(ReviewActivityEvent event) {
        queue.submit(() -> deliver(event));
    }

    void deliver(ReviewActivityEvent event) {
        List<EmailMessage> messages;
        try {
            messages = transaction.execute(status -> compose(event));
        } catch (RuntimeException e) {
            log.error("[Mail] E-mails de {} sur la PR {} non préparés", event.type(), event.pullRequestId(), e);
            return;
        }
        Objects.requireNonNullElse(messages, List.<EmailMessage>of()).forEach(sender::send);
    }

    /** Les e-mails d'un geste, un par destinataire. */
    List<EmailMessage> compose(ReviewActivityEvent event) {
        PullRequest pullRequest = pullRequestRepository.findById(event.pullRequestId()).orElse(null);
        User actor = userRepository.findById(event.actorId()).orElse(null);
        ReviewComment comment = event.commentId() == null ? null : commentRepository.findById(event.commentId()).orElse(null);
        if (pullRequest == null || actor == null || (event.commentId() != null && comment == null)) {
            // Supprimé entre-temps : il n'y a plus rien à annoncer
            return List.of();
        }

        Map<Long, Reason> recipients = new LinkedHashMap<>();
        Long author = pullRequest.getAuthor() == null ? null : pullRequest.getAuthor().getId();
        switch (event.type()) {
            case COMMENTED -> {
                if (author != null) {
                    recipients.put(author, Reason.AUTHOR);
                }
                participantsOf(pullRequest, comment).forEach(id -> recipients.putIfAbsent(id, Reason.PARTICIPANT));
            }
            case REVIEWED, CLAIMED -> {
                if (author != null) {
                    recipients.put(author, Reason.AUTHOR);
                }
            }
            case JUDGED_HELPFUL -> {
                if (event.subjectUserId() != null) {
                    recipients.put(event.subjectUserId(), Reason.REVIEWER);
                }
            }
        }
        recipients.remove(actor.getId());
        if (recipients.isEmpty()) {
            return List.of();
        }

        return userRepository.findAllById(recipients.keySet()).stream()
                .filter(ReviewMailNotifier::reachable)
                .map(recipient -> composer.compose(new ReviewMail(event.type(), recipients.get(recipient.getId()), recipient, actor,
                        pullRequest, comment, ReputationRules.REVIEW_HELPFUL)))
                .toList();
    }

    // Ceux qui ont déjà écrit dans la même discussion : la même ligne, ou la conversation
    private List<Long> participantsOf(PullRequest pullRequest, ReviewComment comment) {
        return comment.getPath() == null
                ? commentRepository.findConversationAuthorIds(pullRequest.getId())
                : commentRepository.findThreadAuthorIds(pullRequest.getId(), comment.getPath(), comment.getLine());
    }

    // Il veut ces e-mails, il a une adresse, et son compte n'est pas suspendu
    private static boolean reachable(User user) {
        return user.isReviewEmails() && !user.isBlocked() && user.getEmail() != null && !user.getEmail().isBlank();
    }
}
