import { api } from './api';
import type { ApiResponse, ContentType } from '@/types/common.types';
import type { VoteRequest, VoteResponse } from '@/types/interaction.types';

const BASE = '/v1/votes';

export const voteService = {
  /** Pose un vote ou inverse le vote existant. Revoter la même valeur ne change rien. */
  vote: (body: VoteRequest) => api.post<ApiResponse<VoteResponse>>(BASE, body).then((r) => r.data.data),

  remove: (targetType: ContentType, targetId: number) =>
    api.delete<ApiResponse<VoteResponse>>(BASE, { params: { targetType, targetId } }).then((r) => r.data.data),
};
