/*
 * Response of the `/micropub?q=config` network request.
 */
export interface ConfigResponse {
  destination: ConfigDestinationResponse[]
}

export type ConfigDestinationResponse = {
    uid: string
    name: string
}
