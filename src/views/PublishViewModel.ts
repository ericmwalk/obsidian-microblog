import { NetworkRequestFactoryInterface } from '@networking/NetworkRequestFactory'
import { NetworkClientInterface } from '@networking/NetworkClient'
import { PublishResponse } from '@networking/PublishResponse'

/*
 * Publish View Delegate Interface, implemented by
 * the object which needs to observe events from the view model.
 */
export interface PublishViewModelDelegate {

    // Triggered when user clicks the delete button when the
    // title property is reset.
    didClearTitle(): void

    // Triggered when publishing a new post succeeds.
    publishDidSucceed(response: PublishResponse): void

    // Triggered when publishing a new post fails.
    publishDidFail(error: Error): void
}

/*
 * This view model drives the content and interactions with the
 * publish view.
 */
export class PublishViewModel {

    // Properties

    public delegate?: PublishViewModelDelegate
    private titleWrappedValue: string
    private content: string
    private visibilityWrappedValue: string
    private tagsWrappedValue: string
    private selectedBlogIDWrappedValue: string
    private networkClient: NetworkClientInterface
    private networkRequestFactory: NetworkRequestFactoryInterface
    readonly blogs: Record<string, string>

    // Life cycle

    constructor(
        title: string,
        content: string,
        tags: string,
        visibility: string,
        blogs: Record<string, string>,
        selectedBlogID: string,
        networkClient: NetworkClientInterface,
        networkRequestFactory: NetworkRequestFactoryInterface
    ) {
        this.titleWrappedValue = title
        this.content = content
        this.tagsWrappedValue = tags
        this.visibilityWrappedValue = visibility
        this.blogs = blogs
        this.selectedBlogIDWrappedValue = selectedBlogID
        this.networkClient = networkClient
        this.networkRequestFactory = networkRequestFactory
    }

    // Public

    public get title(): string {
        return this.titleWrappedValue
    }

    public set title(value: string) {
        this.titleWrappedValue = value
        console.log('Post title changed: ' + value)
    }

    public get tags(): string {
        return this.tagsWrappedValue
    }

    public set tags(value: string) {
        this.tagsWrappedValue = value
        console.log('Post tags changed: ' + value)
    }

    public get visibility(): string {
        return this.visibilityWrappedValue
    }

    public set visibility(value: string) {
        this.visibilityWrappedValue = value
        console.log('Post visibility changed: ' + value)
    }

    public get hasMultipleBlogs(): boolean {
        return Object.keys(this.blogs).length > 2
    }

    public get selectedBlogID(): string {
        return this.selectedBlogIDWrappedValue
    }

    public set selectedBlogID(value: string) {
        this.selectedBlogIDWrappedValue = value
        console.log('Selected blog changed: ' + value)
    }

    public async publishNote() {
        try {
            const response = this.networkRequestFactory.makePublishRequest(
                this.title,
                this.content,
                this.tags,
                this.visibility,
                this.selectedBlogID
            )

            const result = await this.networkClient.run<PublishResponse>(
                response
            )

            this.delegate?.publishDidSucceed(result)
        } catch (error) {
            this.delegate?.publishDidFail(error)
        }
    }

    public clearTitle() {
        this.title = ''
        this.delegate?.didClearTitle()
    }
}