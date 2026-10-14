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

import lombok.RequiredArgsConstructor;

/**
 * Votes, commentaires et notifications désignent leur cible par (type, id), sans clé
 * étrangère. Ce service est le seul endroit qui sait retrouver le contenu derrière ce couple.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ContentTargetService {

    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final ArticleRepository articleRepository;
    private final ProjectRepository projectRepository;

    public ContentTarget resolve(ContentType type, Long id) {
        return find(type, id).orElseThrow(() -> new ResourceNotFoundException(label(type), id));
    }

    public Optional<ContentTarget> find(ContentType type, Long id) {
        return switch (type) {
            case QUESTION -> questionRepository.findById(id).map(question -> new ContentTarget(
                    type, id, question.getAuthor().getId(), question.getTitle(), question.getSlug(), question.getScore()));
            case ANSWER -> answerRepository.findById(id).map(answer -> new ContentTarget(
                    type, id, answer.getAuthor().getId(), answer.getQuestion().getTitle(),
                    answer.getQuestion().getSlug(), answer.getScore()));
            // Un brouillon n'est visible que de son auteur : personne ne peut voter dessus ni le commenter
            case ARTICLE -> articleRepository.findById(id)
                    .filter(article -> article.getStatus() == ArticleStatus.PUBLISHED)
                    .map(article -> new ContentTarget(
                            type, id, article.getAuthor().getId(), article.getTitle(), article.getSlug(), article.getScore()));
            case PROJECT -> projectRepository.findById(id).map(project -> new ContentTarget(
                    type, id, project.getOwner().getId(), project.getName(), project.getSlug(), project.getStarsCount()));
        };
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
