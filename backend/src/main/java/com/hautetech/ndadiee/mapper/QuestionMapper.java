package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hautetech.ndadiee.dto.response.QuestionResponse;
import com.hautetech.ndadiee.dto.response.QuestionSummaryResponse;
import com.hautetech.ndadiee.model.content.Question;

@Mapper(config = MapperConfiguration.class, uses = { UserMapper.class, TagMapper.class })
public interface QuestionMapper {

    @Mapping(target = "excerpt", expression = "java(com.hautetech.ndadiee.common.TextUtils.excerpt(question.getBody()))")
    @Mapping(target = "hasAcceptedAnswer", expression = "java(question.getAcceptedAnswer() != null)")
    QuestionSummaryResponse toSummary(Question question);

    @Mapping(target = "acceptedAnswerId", source = "acceptedAnswer.id")
    QuestionResponse toResponse(Question question);
}
