package com.hautetech.ndadiee.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.hautetech.ndadiee.dto.response.SprintResponse;
import com.hautetech.ndadiee.dto.response.TaskPullRequestResponse;
import com.hautetech.ndadiee.dto.response.TaskResponse;
import com.hautetech.ndadiee.dto.response.TeamMessageResponse;
import com.hautetech.ndadiee.model.review.PullRequest;
import com.hautetech.ndadiee.model.workspace.Sprint;
import com.hautetech.ndadiee.model.workspace.Task;
import com.hautetech.ndadiee.model.workspace.TeamMessage;

@Mapper(config = MapperConfiguration.class, uses = UserMapper.class)
public interface WorkspaceMapper {

    // La pull request et le verdict de sa revue sont renseignés par TaskService : les relecteurs de tout le tableau en
    // une requête
    @Mapping(target = "pullRequest", ignore = true)
    @Mapping(target = "deliveredInSprint", source = "sprint.number")
    TaskResponse toTaskResponse(Task task);

    @Mapping(target = "review", ignore = true)
    TaskPullRequestResponse toPullRequestRef(PullRequest pullRequest);

    // Les tâches sont comptées par SprintService
    @Mapping(target = "taskCount", ignore = true)
    @Mapping(target = "doneCount", ignore = true)
    SprintResponse toSprintResponse(Sprint sprint);

    // Le rendez-vous et ses participants sont renseignés par TeamChatService : ceux de toute la page en une requête
    @Mapping(target = "event", ignore = true)
    TeamMessageResponse toMessageResponse(TeamMessage message);
}
