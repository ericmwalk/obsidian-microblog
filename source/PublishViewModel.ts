import { StoredSettings } from 'source/StoredSettings'
import { NetworkRequestFactoryInterface, PublishResponse } from 'source/NetworkRequest.Publish'
import { NetworkClientInterface } from 'source/NetworkClient'

export class PublishViewModel {

    title: string
    content: string
    visibility: string

    private networkClient: NetworkClientInterface
    private networkRequestFactory: NetworkRequestFactoryInterface

    constructor(
        content: string,
        settings: StoredSettings,
        networkClient: NetworkClientInterface,
        networkRequestFactory: NetworkRequestFactoryInterface
    ) {
        this.title = ""
        this.content = content
        this.visibility = settings.postVisibility
        this.networkClient = networkClient
        this.networkRequestFactory = networkRequestFactory
    }

    async publishNote(): Promise<PublishResponse> {
        const request = this.networkRequestFactory.makePublishRequest(
            this.title,
            this.content,
            this.visibility
        )

        return this.networkClient.run<PublishResponse>(request)
    }
}