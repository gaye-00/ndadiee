package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hautetech.ndadiee.dto.response.FeedItemResponse;
import com.hautetech.ndadiee.model.content.Article;
import com.hautetech.ndadiee.model.content.Question;
import com.hautetech.ndadiee.model.project.Project;

/** Ramène questions, articles et projets à une forme commune pour le fil d'actualité. */
@Mapper(config = MapperConfiguration.class, uses = { UserMapper.class, TagMapper.class })
public interface FeedMapper {

    @Mapping(target = "type", constant = "QUESTION")
    @Mapping(target = "excerpt", expression = "java(com.hautetech.ndadiee.common.TextUtils.excerpt(question.getBody()))")
    FeedItemResponse fromQuestion(Question question);

    @Mapping(target = "type", constant = "ARTICLE")
    @Mapping(target = "createdAt", source = "publishedAt")
    @Mapping(target = "excerpt", expression = "java(com.hautetech.ndadiee.common.TextUtils.excerpt(article.getContent()))")
    FeedItemResponse fromArticle(Article article);

    @Mapping(target = "type", constant = "PROJECT")
    @Mapping(target = "title", source = "name")
    @Mapping(target = "excerpt", expression = "java(com.hautetech.ndadiee.common.TextUtils.excerpt(project.getDescription()))")
    @Mapping(target = "author", source = "owner")
    @Mapping(target = "score", source = "starsCount")
    @Mapping(target = "coverImageUrl", source = "logoUrl")
    FeedItemResponse fromProject(Project project);
}
