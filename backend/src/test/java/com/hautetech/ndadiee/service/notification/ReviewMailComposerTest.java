package com.hautetech.ndadiee.service.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import org.junit.jupiter.api.Test;

import com.hautetech.ndadiee.event.ReviewActivityEvent.Type;
import com.hautetech.ndadiee.mail.EmailMessage;
import com.hautetech.ndadiee.mail.MailConfiguration;
import com.hautetech.ndadiee.model.Language;
import com.hautetech.ndadiee.model.project.Project;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.review.ReviewComment;
import com.hautetech.ndadiee.model.review.ReviewState;
import com.hautetech.ndadiee.model.user.Developer;
import com.hautetech.ndadiee.service.notification.ReviewMail.Reason;

/**
 * Un e-mail de revue dit qui a fait quoi, dans la langue du destinataire ; il cite le commentaire sans jamais
 * interpréter le HTML qu'un membre y aurait écrit, et mène à la ligne commentée par la même ancre que le site.
 */
class ReviewMailComposerTest {

    private final ReviewMailComposer composer = new ReviewMailComposer(new MailConfiguration().mailMessages(), "https://ndadiee.example/");

    private static final Project PROJECT = Project.builder().id(1L).name("Lagos Transit").slug("lagos-transit").build();
    private static final PullRequest PR = PullRequest.builder().id(84L).number(84).title("Cache Redis pour les horaires BRT").project(PROJECT)
            .author(developer(1L, "Ama Owusu", Language.FR)).build();

    private static Developer developer(Long id, String name, Language language) {
        return Developer.builder().id(id).fullName(name).email(name.toLowerCase().replace(' ', '.') + "@example.com").preferredLanguage(language).build();
    }

    private static ReviewComment lineComment(String body, String suggestion) {
        return ReviewComment.builder().id(9L).pullRequest(PR).author(developer(2L, "Chinedu Okafor", Language.EN)).body(body)
                .path("internal/schedule/cache.go").line(24).suggestion(suggestion).build();
    }

    @Test
    void theAnchorOfAFileIsTheOneTheSiteComputes() {
        // Relevé dans le navigateur : /projects/lagos-transit/reviews/84#file-rjrizp-R24
        assertThat(ReviewMailComposer.fileAnchor("internal/schedule/cache.go")).isEqualTo("file-rjrizp");
    }

    @Test
    void aVerdictIsAnnouncedInFrenchWithItsBadge() {
        ReviewComment verdict = ReviewComment.builder().id(10L).pullRequest(PR).author(developer(2L, "Chinedu Okafor", Language.FR))
                .verdict(ReviewState.CHANGES_REQUESTED).body("Avant de fusionner : l'expiration du cache.").build();

        EmailMessage mail = composer.compose(new ReviewMail(Type.REVIEWED, Reason.AUTHOR, developer(1L, "Ama Owusu", Language.FR),
                developer(2L, "Chinedu Okafor", Language.FR), PR, verdict, 10));

        assertThat(mail.to()).isEqualTo("ama.owusu@example.com");
        assertThat(mail.subject()).isEqualTo("[Lagos Transit] Chinedu Okafor demande des changements sur #84");
        assertThat(mail.html()).contains("Bonjour Ama,", "Changements demandés", "l&#39;expiration du cache",
                "https://ndadiee.example/projects/lagos-transit/reviews/84?tab=conversation", "https://ndadiee.example/settings#review-emails",
                "parce que tu as ouvert cette pull request");
        assertThat(mail.text()).contains("> Avant de fusionner : l'expiration du cache.", "Voir la revue\nhttps://ndadiee.example/projects/lagos-transit/reviews/84?tab=conversation");
        assertThat(mail.tag()).isEqualTo("review.reviewed.changes_requested");
    }

    @Test
    void aLineCommentLeadsToItsLineInEnglish() {
        EmailMessage mail = composer.compose(new ReviewMail(Type.COMMENTED, Reason.AUTHOR, developer(1L, "Ama Owusu", Language.EN),
                developer(2L, "Chinedu Okafor", Language.EN), PR, lineComment("Expiry at 0: never refreshed.", "\tif err == nil {}"), 10));

        assertThat(mail.subject()).isEqualTo("[Lagos Transit] Chinedu Okafor commented on your pull request #84");
        assertThat(mail.html()).contains("Hi Ama,", "internal/schedule/cache.go · line 24", "View the commented line",
                "https://ndadiee.example/projects/lagos-transit/reviews/84#file-rjrizp-R24", "\tif err == nil {}");
        assertThat(mail.text()).contains("Suggestion\n    \tif err == nil {}");
    }

    @Test
    void whatAMemberWroteIsNeverInterpretedAsHtml() {
        EmailMessage mail = composer.compose(new ReviewMail(Type.COMMENTED, Reason.PARTICIPANT, developer(3L, "Wanjiru Kamau", Language.FR),
                developer(2L, "Chinedu <b>Okafor</b>", Language.FR), PR, lineComment("<script>alert(1)</script>", "<img src=x onerror=1>"), 10));

        assertThat(mail.html()).doesNotContain("<script>", "<img", "<b>Okafor")
                .contains("&lt;script&gt;alert(1)&lt;/script&gt;", "&lt;img src=x onerror=1&gt;");
        assertThat(mail.subject()).contains("a répondu dans une discussion de #84");
    }

    @Test
    void aHelpfulReviewSaysWhatItEarnsWithItsApostrophes() {
        EmailMessage mail = composer.compose(new ReviewMail(Type.JUDGED_HELPFUL, Reason.REVIEWER, developer(3L, "Wanjiru Kamau", Language.FR),
                developer(1L, "Ama Owusu", Language.FR), PR, null, 10));

        assertThat(mail.subject()).isEqualTo("[Lagos Transit] Ta revue de #84 a été jugée utile : +10 de réputation");
        assertThat(mail.html()).contains("L’équipe de Lagos Transit a jugé ta revue utile", "Merci d’avoir pris le temps");
    }

    @Test
    void aLongCommentIsCutOnASpace() {
        String excerpt = ReviewMailComposer.excerpt("mot ".repeat(400));

        assertThat(excerpt).endsWith("…").hasSizeLessThanOrEqualTo(ReviewMailComposer.EXCERPT_LENGTH + 1);
        assertThat(excerpt).doesNotContain("mo…");
    }

    @Test
    void everyEventHasItsTextsInBothLanguages() {
        for (Language language : Language.values()) {
            Developer recipient = developer(1L, "Ama Owusu", language);
            Developer actor = developer(2L, "Chinedu Okafor", language);
            for (ReviewState state : new ReviewState[] { ReviewState.APPROVED, ReviewState.CHANGES_REQUESTED, ReviewState.COMMENTED }) {
                ReviewComment verdict = ReviewComment.builder().id(1L).pullRequest(PR).author(actor).verdict(state).build();
                assertThatCode(() -> composer.compose(new ReviewMail(Type.REVIEWED, Reason.AUTHOR, recipient, actor, PR, verdict, 10)))
                        .doesNotThrowAnyException();
            }
            for (Reason reason : new Reason[] { Reason.AUTHOR, Reason.PARTICIPANT }) {
                assertThatCode(() -> composer.compose(new ReviewMail(Type.COMMENTED, reason, recipient, actor, PR, lineComment("Ok", null), 10)))
                        .doesNotThrowAnyException();
            }
            assertThatCode(() -> composer.compose(new ReviewMail(Type.CLAIMED, Reason.AUTHOR, recipient, actor, PR, null, 10)))
                    .doesNotThrowAnyException();
            assertThatCode(() -> composer.compose(new ReviewMail(Type.JUDGED_HELPFUL, Reason.REVIEWER, recipient, actor, PR, null, 10)))
                    .doesNotThrowAnyException();
        }
    }
}
