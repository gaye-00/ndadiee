package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hautetech.ndadiee.dto.response.ArticleResponse;
import com.hautetech.ndadiee.dto.response.ArticleSummaryResponse;
import com.hautetech.ndadiee.model.content.Article;

@Mapper(config = MapperConfiguration.class, uses = { UserMapper.class, TagMapper.class })
public interface ArticleMapper {

    @Mapping(target = "excerpt", expression = "java(com.hautetech.ndadiee.common.TextUtils.excerpt(article.getContent()))")
    ArticleSummaryResponse toSummary(Article article);

    ArticleResponse toResponse(Article article);
}
