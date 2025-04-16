import { MicroPluginContainerInterface } from '@base/MicroPluginContainer'
import { MicropostViewModel } from '@base/views/MicropostViewModel'
import { ServiceFactory, ServiceFactoryInterface } from '@factories/ServiceFactory'
import { MarkdownPage, MarkdownPageInterface } from '@models/MarkdownPage'
import { MarkdownPost, MarkdownPostInterface } from '@models/MarkdownPost'
import { FrontmatterServiceInterface } from '@services/FrontmatterService'
import { ErrorViewModel } from '@views/ErrorViewModel'
import { MicroPluginSettingsViewModel } from '@views/MicroPluginSettingsViewModel'
import { PublishPageViewModel } from '@views/PublishPageViewModel'
import { PublishPostViewModel } from '@views/PublishPostViewModel'
import { TagSuggestionDelegate, TagSuggestionViewModel } from '@views/TagSuggestionViewModel'
import { UpdatePageViewModel } from '@views/UpdatePageViewModel'
import { UpdatePostViewModel } from '@views/UpdatePostViewModel'
import { MarkdownView } from 'obsidian'
import type MicroPlugin from '@base/MicroPlugin'

export interface ViewModelFactoryInterface {
    makeSubmitPostViewModel(markdownView: MarkdownView): PublishPostViewModel | UpdatePostViewModel
    makeSubmitPageViewModel(markdownView: MarkdownView): PublishPageViewModel | UpdatePageViewModel
    makeMicroPluginSettingsViewModel(): MicroPluginSettingsViewModel
    makeTagSuggestionViewModel(
        blogID: string,
        excluding: string[],
        delegate?: TagSuggestionDelegate
    ): TagSuggestionViewModel
    makeMicropostViewModel(): MicropostViewModel
    makeEmptyPostErrorViewModel(): ErrorViewModel
    makeEmptyPageErrorViewModel(): ErrorViewModel
    plugin: MicroPlugin // ✅ Exposed so view models can use it
}

/*
 * View Model Factory builds all the View Models in the plugin.
 * It simplifies building View Models since all the resolved dependencies
 * are already available via the factory.
 */
export class ViewModelFactory implements ViewModelFactoryInterface {

    // Properties

    private container: MicroPluginContainerInterface
    private serviceFactory: ServiceFactoryInterface
    public plugin: MicroPlugin // ✅ Exposed publicly

    // Life cycle

    constructor(container: MicroPluginContainerInterface) {
        this.container = container
        this.plugin = container.plugin // ✅ Plugin access stored
        this.serviceFactory = new ServiceFactory(container)
    }

    // Public

    public makeSubmitPostViewModel(markdownView: MarkdownView): PublishPostViewModel | UpdatePostViewModel {
        const frontmatterService = this.serviceFactory.makeFrontmatterService(markdownView.file)

        const post = new MarkdownPost(frontmatterService, markdownView)

        if (post.url && post.url.length > 0) {
            return this.makeUpdatePostViewModel(
                post.url,
                post.title,
                post.content,
                post.tags || '',
                frontmatterService
            )
        } else {
            return this.makePublishPostViewModel(post, frontmatterService)
        }
    }

    public makeSubmitPageViewModel(markdownView: MarkdownView): PublishPageViewModel | UpdatePageViewModel {
        const frontmatterService = this.serviceFactory.makeFrontmatterService(markdownView.file)

        const page = new MarkdownPage(frontmatterService, markdownView)

        if (page.url && page.url.length > 0) {
            return this.makeUpdatePageViewModel(page.url, page.title, page.content, frontmatterService)
        } else {
            return this.makePublishPageViewModel(page, frontmatterService)
        }
    }

    public makeMicroPluginSettingsViewModel(): MicroPluginSettingsViewModel {
        return new MicroPluginSettingsViewModel(
            this.container.plugin,
            this.container.settings,
            this.container.networkClient,
            this.container.networkRequestFactory
        )
    }

    public makeTagSuggestionViewModel(
        blogID: string,
        excluding: string[],
        delegate?: TagSuggestionDelegate
    ): TagSuggestionViewModel {
        const suggestions = this
            .synchronizedCategories(blogID)
            .filter(tag => !excluding.includes(tag))
            .sort()

        const viewModel = new TagSuggestionViewModel(suggestions)
        viewModel.delegate = delegate

        return viewModel
    }

    public makeMicropostViewModel(): MicropostViewModel {
        return new MicropostViewModel(
            this.container.settings.postVisibility,
            this.container.settings.blogs,
            this.container.settings.selectedBlogID,
            this.container.networkClient,
            this.container.networkRequestFactory
        )
    }

    public makeEmptyPostErrorViewModel(): ErrorViewModel {
        return new ErrorViewModel(
            'Oops',
            'Micro.blog does not support blank posts. Please write something before trying again.'
        )
    }

    public makeEmptyPageErrorViewModel(): ErrorViewModel {
        return new ErrorViewModel(
            'Oops',
            'Micro.blog does not support blank pages. Please write something before trying again.'
        )
    }

    // Private

    private makePublishPostViewModel(
        post: MarkdownPostInterface,
        frontmatterService: FrontmatterServiceInterface
    ): PublishPostViewModel {
        return new PublishPostViewModel(
            post.title,
            post.content,
            post.tags || this.container.settings.defaultTags,
            this.container.settings.postVisibility,
            this.container.settings.blogs,
            this.container.settings.selectedBlogID,
            this.container.networkClient,
            frontmatterService,
            this.container.networkRequestFactory,
            this
        )
    }

    private makeUpdatePostViewModel(
        url: string,
        title: string,
        content: string,
        tags: string,
        frontmatterService: FrontmatterServiceInterface
    ): UpdatePostViewModel {
        return new UpdatePostViewModel(
            url,
            title,
            content,
            tags,
            this.container.settings.blogs,
            this.container.settings.selectedBlogID,
            this.container.networkClient,
            frontmatterService,
            this.container.networkRequestFactory,
            this
        )
    }

    private makePublishPageViewModel(
        page: MarkdownPageInterface,
        frontmatterService: FrontmatterServiceInterface
    ): PublishPageViewModel {
        return new PublishPageViewModel(
            page.title,
            page.content,
            this.container.settings.blogs,
            this.container.settings.selectedBlogID,
            this.container.settings.includePagesInNavigation,
            this.container.networkClient,
            frontmatterService,
            this.container.networkRequestFactory
        )
    }

    private makeUpdatePageViewModel(
        url: string,
        title: string,
        content: string,
        frontmatterService: FrontmatterServiceInterface
    ): UpdatePageViewModel {
        return new UpdatePageViewModel(
            url,
            title,
            content,
            this.container.settings.blogs,
            this.container.settings.selectedBlogID,
            this.container.networkClient,
            frontmatterService,
            this.container.networkRequestFactory
        )
    }

    // Return the categories for the selected blog.
    // In case the selected blog is the `default`, then show
    // all categories (removing duplicates).
    private synchronizedCategories(blogID: string): string[] {
        const categories = this.container.settings.synchronizedCategories

        if (blogID === 'default') {
            return Array.from(new Set(Object.values(categories).flat()))
        } else {
            return categories[blogID]
        }
    }
}
