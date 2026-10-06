export interface DeleteResponse {
  success: boolean;
}

export interface CreateResponse<TId = string> {
  id: TId;
}
