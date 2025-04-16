import { ViewModelFactoryInterface } from '@factories/ViewModelFactory'
import { NetworkClientInterface } from '@networking/NetworkClient'
import { NetworkRequestFactoryInterface } from '@networking/NetworkRequestFactory'
import { PublishResponse } from '@networking/PublishResponse'
import { FrontmatterServiceInterface } from '@services/FrontmatterService'
import { TagSuggestionDelegate, TagSuggestionViewModel } from '@views/TagSuggestionViewModel'
import { Notice, normalizePath, TFile } from 'obsidian'

/*
 * `PublishPostViewModelDelegate` interface, implemented by
 * the object that needs to observe events from the view model.
 */
export interface PublishPostViewModelDelegate {
    publishDidClearTitle(): void
    publishDidClearDate(): void
    publishDidSucceed(response: PublishResponse): void
    publishDidFail(error: Error): void
    publishDidSelectTag(): void
    publishDidValidateDate(): void
}

/*
 * This view model drives the content and interactions with the
 * publish post view.
 */
export class PublishPostViewModel implements TagSuggestionDelegate {
    public delegate?: PublishPostViewModelDelegate
    private isValidDate: boolean
    private isSubmitting: boolean
    private titleWrappedValue: string
    private content: string
    private visibilityWrappedValue: string
    private tagsWrappedValue: string
    private selectedBlogIDWrappedValue: string
    private scheduledDateWrappedValue: string
    private networkClient: NetworkClientInterface
    private frontmatterService: FrontmatterServiceInterface
    private networkRequestFactory: NetworkRequestFactoryInterface
    private viewModelFactory: ViewModelFactoryInterface
    readonly blogs: Record<string, string>

    constructor(
        title: string,
        content: string,
        tags: string,
        visibility: string,
        blogs: Record<string, string>,
        selectedBlogID: string,
        networkClient: NetworkClientInterface,
        frontmatterService: FrontmatterServiceInterface,
        networkRequestFactory: NetworkRequestFactoryInterface,
        viewModelFactory: ViewModelFactoryInterface
    ) {
        this.titleWrappedValue = title
        this.content = content
        this.tagsWrappedValue = tags
        this.visibilityWrappedValue = visibility
        this.blogs = blogs
        this.selectedBlogIDWrappedValue = selectedBlogID
        this.scheduledDateWrappedValue = ''
        this.isValidDate = true
        this.isSubmitting = false
        this.networkClient = networkClient
        this.frontmatterService = frontmatterService
        this.networkRequestFactory = networkRequestFactory
        this.viewModelFactory = viewModelFactory
    }

    public get title(): string {
        return this.titleWrappedValue
    }

    public set title(value: string) {
        this.titleWrappedValue = value
    }

    public get tags(): string {
        return this.tagsWrappedValue
    }

    public set tags(value: string) {
        this.tagsWrappedValue = value
    }

    public get visibility(): string {
        return this.visibilityWrappedValue
    }

    public set visibility(value: string) {
        this.visibilityWrappedValue = value
    }

    public get hasMultipleBlogs(): boolean {
        return Object.keys(this.blogs).length > 2
    }

    public get selectedBlogID(): string {
        return this.selectedBlogIDWrappedValue
    }

    public set selectedBlogID(value: string) {
        this.selectedBlogIDWrappedValue = value
    }

    public get scheduledDate(): string {
        return this.scheduledDateWrappedValue
    }

    public set scheduledDate(value: string) {
        this.scheduledDateWrappedValue = value
    }

    public get showPublishingButton(): boolean {
        return this.isValidDate && this.isSubmitting
    }

    public get invalidDateText(): string {
        return this.isValidDate ? '' : 'Invalid date format'
    }

    public async publishNote() {
        if (!this.isValidScheduledDate()) {
            this.isValidDate = false
            this.isSubmitting = false
            this.delegate?.publishDidValidateDate()
            return
        }

        this.isValidDate = true
        this.isSubmitting = true
        this.delegate?.publishDidValidateDate()

        try {
            const tags = this.tags.validValues()

            const response = this.networkRequestFactory.makePublishPostRequest(
                this.title,
                this.content,
                tags,
                this.visibility,
                this.selectedBlogID,
                this.formattedScheduledDate()
            )

            const result = await this.networkClient.run<PublishResponse>(response)

            this.frontmatterService.save(this.title, 'title')
            this.frontmatterService.save(result.url, 'url')
            this.frontmatterService.save(tags, 'tags')

            // 🆕 Rename the note if setting is enabled
            const plugin = this.viewModelFactory.plugin
            const shouldRename = plugin.getSetting('renameNoteAfterPublish')

            if (shouldRename) {
                const activeFile = plugin.app.workspace.getActiveFile()
                if (activeFile) {
                    const newName = this.generateNoteNameFromUrl(result.url)
                    const newPath = normalizePath(`${activeFile.parent?.path ?? ''}/${newName}.md`)
                    await plugin.app.fileManager.renameFile(activeFile, newPath)
                    new Notice(`Note renamed to: ${newName}`)
                }
            }

            this.delegate?.publishDidSucceed(result)
        } catch (error) {
            this.delegate?.publishDidFail(error)
        }
    }

    public clearTitle() {
        this.title = ''
        this.delegate?.publishDidClearTitle()
    }

    public clearDate() {
        this.scheduledDateWrappedValue = ''
        this.isValidDate = true
        this.delegate?.publishDidClearDate()
    }

    public suggestionsViewModel(): TagSuggestionViewModel {
        const excluding = this.tags.validValues()
        return this.viewModelFactory.makeTagSuggestionViewModel(this.selectedBlogID, excluding, this)
    }

    // Private

    private isValidScheduledDate(): boolean {
        const scheduledDate = new Date(this.scheduledDateWrappedValue)
        return !(this.scheduledDateWrappedValue.length > 0 && isNaN(scheduledDate.getTime()))
    }

    private formattedScheduledDate(): string {
        const scheduledDate = new Date(this.scheduledDateWrappedValue.trim())
        return isNaN(scheduledDate.getTime()) ? '' : scheduledDate.toISOString()
    }

    private generateNoteNameFromUrl(url: string): string {
        try {
            const u = new URL(url)
            const parts = u.pathname.split('/').filter(Boolean)
            if (parts.length >= 3) {
                const [year, month, day, ...slugParts] = parts
                const slug = slugParts.join('-') || parts.at(-1) || 'post'
                return `${year}-${month}-${day}_${slug.replace(/\.html$/, '')}`
            }
            return 'published-note'
        } catch {
            return 'published-note'
        }
    }

    // TagSuggestionDelegate

    public tagSuggestionDidSelectTag(category: string) {
        const tags = this.tags.validValues()
        tags.push(category)

        const formattedTags = tags
            .filter((tag, index) => index === tags.indexOf(tag))
            .join()

        this.tags = formattedTags
        this.delegate?.publishDidSelectTag()
    }
}
