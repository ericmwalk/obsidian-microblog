import { PublishResponse } from '@networking/PublishResponse'
import { PublishPostViewModel, PublishPostViewModelDelegate } from '@views/PublishPostViewModel'
import { TagSuggestionView } from '@views/TagSuggestionView'
import { App, Modal, Notice, Setting, TFile, normalizePath } from 'obsidian'

export class PublishPostView extends Modal implements PublishPostViewModelDelegate {
    private viewModel: PublishPostViewModel

    constructor(viewModel: PublishPostViewModel, app: App) {
        super(app)
        this.viewModel = viewModel
        this.viewModel.delegate = this
    }

    public onOpen() {
        super.onOpen()

        const { contentEl } = this
        contentEl.empty()
        contentEl.createEl('h2', { text: 'Review' })

        new Setting(contentEl)
            .setName('Title')
            .setDesc('While optional, it is encouraged to include a post title for longer posts.')
            .addText(text => text
                .setPlaceholder('Optional title')
                .setValue(this.viewModel.title)
                .onChange(value => {
                    this.viewModel.title = value
                })
            )
            .addExtraButton(button => button
                .setIcon('cross')
                .setTooltip('Clear title')
                .onClick(() => {
                    this.viewModel.clearTitle()
                })
            )

        if (this.viewModel.hasMultipleBlogs) {
            new Setting(contentEl)
                .setName('Blog')
                .setDesc('Override the default blog settings for this post.')
                .addDropdown(dropDown => dropDown
                    .addOptions(this.viewModel.blogs)
                    .setValue(this.viewModel.selectedBlogID)
                    .onChange(value => {
                        this.viewModel.selectedBlogID = value
                    })
                )
        }

        new Setting(contentEl)
            .setName('Categories')
            .setDesc('Override the default categories assigned to this post.')
            .addText(text => text
                .setPlaceholder('category1, category2, category3')
                .setValue(this.viewModel.tags)
                .onChange(value => {
                    this.viewModel.tags = value
                })
            )
            .addExtraButton(button => button
                .setIcon('plus')
                .setTooltip('Add categories')
                .onClick(() => {
                    new TagSuggestionView(
                        this.viewModel.suggestionsViewModel(),
                        this.app
                    ).open()
                })
            )

        new Setting(contentEl)
            .setName('Visibility')
            .setDesc('Override the default post visibility setting for this specific post.')
            .addDropdown(dropDown => dropDown
                .addOption('draft', 'Draft')
                .addOption('published', 'Public')
                .setValue(this.viewModel.visibility)
                .onChange(value => {
                    this.viewModel.visibility = value
                })
            )

        new Setting(contentEl)
            .setName('Scheduled date')
            .setDesc('Optional date for scheduling posts. Format: YYYY-MM-DD HH:MM.')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD HH:MM')
                .setValue(this.viewModel.scheduledDate)
                .onChange(value => {
                    this.viewModel.scheduledDate = value
                })
            )
            .addExtraButton(button => button
                .setIcon('cross')
                .setTooltip('Clear date')
                .onClick(() => {
                    this.viewModel.clearDate()
                })
            )

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText('Publish')
                .setCta()
                .onClick(async _ => {
                    await this.viewModel.publishNote()
                })
                .then(button => {
                    if (this.viewModel.showPublishingButton) {
                        button
                            .setDisabled(true)
                            .removeCta()
                            .setButtonText('Publishing...')
                    }
                })
            )
            .setDesc(this.viewModel.invalidDateText)
    }

    public onClose() {
        super.onClose()
        const { contentEl } = this
        contentEl.empty()
        this.viewModel.delegate = undefined
    }

    public publishDidClearTitle() {
        this.onOpen()
    }

    public publishDidClearDate() {
        this.onOpen()
    }

    public async publishDidSucceed(response: PublishResponse) {
        this.makeConfirmationView(response)

        const url = response.url

        // Extract date + slug (e.g., /2025/04/14/this-is-my-post.html)
        const match = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\/([^\/?#]+)(?:\?.*)?$/)
        if (match) {
            const [, year, month, day, rawSlug] = match
            const datePrefix = `${year}-${month}-${day}`
            const cleanSlug = rawSlug.replace(/\.[^/.]+$/, '') // remove .html
            const newBaseName = `${datePrefix}_${cleanSlug}`

            const file = this.app.workspace.getActiveFile()
            if (file instanceof TFile) {
                const newFileName = `${newBaseName}.${file.extension}`
                const newPath = normalizePath(file.path.replace(file.name, newFileName))

                try {
                    await this.app.vault.rename(file, newPath)
                    new Notice(`Note renamed to ${newFileName}`)

                    // Reopen renamed file
                    const newFile = this.app.vault.getAbstractFileByPath(newPath)
                    if (newFile instanceof TFile) {
                        await this.app.workspace.getLeaf(true).openFile(newFile)
                    }
                } catch (err) {
                    console.error("Failed to rename file:", err)
                    new Notice("Failed to rename the file after publishing.")
                }
            }
        }
    }

    public publishDidFail(error: Error) {
        this.makeMessageView('Error', error.message)
    }

    public publishDidSelectTag() {
        this.onOpen()
    }

    public publishDidValidateDate() {
        this.onOpen()
    }

    private makeConfirmationView(response: PublishResponse) {
        const { contentEl } = this
        contentEl.empty()
        contentEl.createEl('h2', { text: 'Published' })
        contentEl.createEl('a', { text: 'Open post URL', href: response.url })
        contentEl.createEl('br')
        contentEl.createEl('a', { text: 'Open post Preview URL', href: response.preview })
    }

    private makeMessageView(title: string, message: string) {
        const { contentEl } = this
        contentEl.empty()
        contentEl.createEl('h2', { text: title })
        contentEl.createEl('p', { text: message })
    }
}
