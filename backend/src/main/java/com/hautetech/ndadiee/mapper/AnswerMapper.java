package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hautetech.ndadiee.dto.response.AnswerResponse;
import com.hautetech.ndadiee.model.content.Answer;

@Mapper(config = MapperConfiguration.class, uses = UserMapper.class)
public interface AnswerMapper {

    @Mapping(target = "questionId", source = "question.id")
    AnswerResponse toResponse(Answer answer);
}
