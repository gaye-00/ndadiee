package com.hautetech.ndadiee.service.interaction;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hautetech.ndadiee.exception.ResourceNotFoundException;
import com.hautetech.ndadiee.model.ContentType;
import com.hautetech.ndadiee.model.content.ArticleStatus;
import com.hautetech.ndadiee.repository.AnswerRepository;
import com.hautetech.ndadiee.repository.ArticleRepository;
import com.hautetech.ndadiee.repository.ProjectRepository;
import com.hautetech.ndadiee.repository.QuestionRepository;
import com.hautetech.ndadiee.service.user.UserService;

import lombok.RequiredArgsConstructor;

/**
 * Votes, commentaires et notifications désignent leur cible par (type, id), sans clé
 * étrangère. Ce service est le seul endroit qui sait retrouver le contenu derrière ce couple.
 *
 * Un contenu masqué par l'administration (pour une réponse : elle, ou son sujet) ne se vote ni ne se commente
 * plus, et ses notifications perdent leur lien ; son auteur et les admins lisent encore ses commentaires.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ContentTargetService {

    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final ArticleRepository articleRepository;
    private final ProjectRepository projectRepository;
    private final UserService userService;

    /** Le contenu visible derrière ce couple, pour voter dessus ou le commenter ; 404 sinon. */
    public ContentTarget resolve(ContentType type, Long id) {
        return find(type, id).orElseThrow(() -> new ResourceNotFoundException(label(type), id));
    }

    /** Pour lire ce qui s'y rattache (ses commentaires) : masqué, il reste lisible de son auteur et des admins. */
    public ContentTarget resolveFor(ContentType type, Long id, Long viewerId) {
        return lookup(type, id)
                .filter(found -> !found.hidden() || userService.canSeeHidden(viewerId, found.target().ownerId()))
                .map(Located::target)
                .orElseThrow(() -> new ResourceNotFoundException(label(type), id));
    }

    /** Le contenu derrière ce couple, s'il existe et reste visible du public. */
    public Optional<ContentTarget> find(ContentType type, Long id) {
        return lookup(type, id).filter(found -> !found.hidden()).map(Located::target);
    }

    private Optional<Located> lookup(ContentType type, Long id) {
        return switch (type) {
            case QUESTION -> questionRepository.findById(id).map(question -> new Located(new ContentTarget(
                    type, id, question.getAuthor().getId(), question.getTitle(), question.getSlug(), question.getScore()),
                    question.isHidden()));
            case ANSWER -> answerRepository.findById(id).map(answer -> new Located(new ContentTarget(
                    type, id, answer.getAuthor().getId(), answer.getQuestion().getTitle(),
                    answer.getQuestion().getSlug(), answer.getScore()),
                    answer.isHidden() || answer.getQuestion().isHidden()));
            // Un brouillon n'est visible que de son auteur : personne ne peut voter dessus ni le commenter
            case ARTICLE -> articleRepository.findById(id)
                    .filter(article -> article.getStatus() == ArticleStatus.PUBLISHED)
                    .map(article -> new Located(new ContentTarget(
                            type, id, article.getAuthor().getId(), article.getTitle(), article.getSlug(), article.getScore()),
                            false));
            case PROJECT -> projectRepository.findById(id).map(project -> new Located(new ContentTarget(
                    type, id, project.getOwner().getId(), project.getName(), project.getSlug(), project.getStarsCount()),
                    project.isHidden()));
        };
    }

    // Un contenu, et s'il est masqué par l'administration
    private record Located(ContentTarget target, boolean hidden) {
    }

    @Transactional
    public void addScore(ContentType type, Long id, int delta) {
        switch (type) {
            case QUESTION -> questionRepository.addScore(id, delta);
            case ANSWER -> answerRepository.addScore(id, delta);
            case ARTICLE -> articleRepository.addScore(id, delta);
            case PROJECT -> projectRepository.addStars(id, delta);
        }
    }

    private String label(ContentType type) {
        return switch (type) {
            case QUESTION -> "Question";
            case ANSWER -> "Réponse";
            case ARTICLE -> "Article";
            case PROJECT -> "Projet";
        };
    }
}
