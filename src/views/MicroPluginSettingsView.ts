import { App, Notice, PluginSettingTab, Setting } from 'obsidian'
import { MicroPluginSettingsDelegate } from '../interfaces/MicroPluginSettingsDelegate'
import { MicroPluginSettingsViewModel } from './MicroPluginSettingsViewModel'

export class MicroPluginSettingsView extends PluginSettingTab implements MicroPluginSettingsDelegate {
  private viewModel: MicroPluginSettingsViewModel

  constructor(viewModel: MicroPluginSettingsViewModel, app: App) {
    super(app, viewModel.plugin)
    this.viewModel = viewModel
  }

  public display() {
    this.viewModel.delegate = this

    const plugin = this.viewModel.plugin
    const { containerEl } = this
    containerEl.empty()

    if (!this.viewModel.hasAppToken) {
      this.makeLoginView()
      return
    }

    // Blog
    containerEl.createEl('h2', { text: 'Blog' })

    new Setting(containerEl)
      .setName('Blog')
      .setDesc('Default blog for new posts and pages.')
      .addDropdown(dropDown =>
        dropDown
          .addOptions(this.viewModel.blogs)
          .setValue(plugin.getSetting('selectedBlogID') ?? 'default')
          .onChange(async value => {
            await plugin.updateSetting('selectedBlogID', value)
          })
      )
      .addExtraButton(button =>
        button
          .setIcon('sync')
          .setTooltip('Refresh blogs')
          .onClick(async () => {
            button.setDisabled(true)
            await this.viewModel.refreshBlogs()
          })
      )

    // Posts
    containerEl.createEl('h2', { text: 'Posts' })

    new Setting(containerEl)
      .setName('Categories')
      .setDesc('Default list of categories for new posts.')
      .addText(text =>
        text
          .setPlaceholder('category1, category2')
          .setValue(plugin.getSetting('defaultTags') ?? '')
          .onChange(async value => {
            await plugin.updateSetting('defaultTags', value)
          })
      )

    new Setting(containerEl)
      .setName('Visibility')
      .setDesc('Default visibility for new posts.')
      .addDropdown(dropDown =>
        dropDown
          .addOption('draft', 'Draft')
          .addOption('published', 'Public')
          .setValue(plugin.getSetting('postVisibility') ?? 'draft')
          .onChange(async value => {
            await plugin.updateSetting('postVisibility', value)
          })
      )

    // Pages
    containerEl.createEl('h2', { text: 'Pages' })

    new Setting(containerEl)
      .setName('Navigation')
      .setDesc('Include new pages in blog navigation.')
      .addToggle(toggle =>
        toggle
          .setValue(plugin.getSetting('includePagesInNavigation') ?? false)
          .onChange(async value => {
            await plugin.updateSetting('includePagesInNavigation', value)
          })
      )

    // Misc
    containerEl.createEl('h2', { text: 'Misc.' })

    new Setting(containerEl)
      .setName('Categories synchronization')
      .setDesc('Sync categories when Obsidian opens.')
      .addToggle(toggle =>
        toggle
          .setValue(plugin.getSetting('synchronizeCategoriesOnOpen') ?? true)
          .onChange(async value => {
            await plugin.updateSetting('synchronizeCategoriesOnOpen', value)
          })
      )

    new Setting(containerEl)
      .setName('Delete images after upload')
      .setDesc('Removes local image file after uploading to Micro.blog.')
      .addToggle(toggle =>
        toggle
          .setValue(plugin.getSetting('deleteAfterUpload') ?? false)
          .onChange(async value => {
            await plugin.updateSetting('deleteAfterUpload', value)
          })
      )

    new Setting(containerEl)
      .setName('Rename note after publishing')
      .setDesc('Automatically rename the note based on the Micro.blog URL.')
      .addToggle(toggle =>
        toggle
          .setValue(plugin.getSetting('renameNoteAfterPublish') ?? false)
          .onChange(async value => {
            await plugin.updateSetting('renameNoteAfterPublish', value)
          })
      )

    new Setting(containerEl)
      .setName('ChatGPT API Key (for alt text)')
      .setDesc('Used to generate AI-based alt text for uploaded images.')
      .addText(text =>
        text
          .setPlaceholder('sk-...')
          .setValue(plugin.getSetting('chatGPTApiKey') ?? '')
          .onChange(async value => {
            await plugin.updateSetting('chatGPTApiKey', value)
          })
      )

    // Sponsor
    new Setting(containerEl)
      .setName('Sponsor')
      .setDesc('Enjoying this plugin? Show your support ☕')
      .addButton(button => {
        button.buttonEl.outerHTML =
          '<a href="https://ko-fi.com/otaviocc" target="_blank"><img height="36" style="border:0px;height:36px;" src="https://storage.ko-fi.com/cdn/kofi3.png?v=3" border="0" alt="Buy Me a Coffee at ko-fi.com" /></a>'
      })

    new Setting(containerEl)
      .addButton(button =>
        button
          .setButtonText('Log out')
          .setCta()
          .onClick(() => {
            this.viewModel.logout()
          })
      )
  }

  private makeLoginView() {
    const { containerEl } = this
    containerEl.empty()

    new Setting(containerEl)
      .setName('App Token')
      .setDesc("Visit Micro.blog's Account page to generate one.")
      .addText(text =>
        text
          .setPlaceholder('Enter app token')
          .setValue(this.viewModel.appToken)
          .onChange(() => {})
      )

    new Setting(containerEl)
      .addButton(button =>
        button
          .setButtonText('Log in')
          .setCta()
          .onClick(async () => {
            button.setDisabled(true)
            button.removeCta()
            button.setButtonText('Logging in...')
            await this.viewModel.validate()
          })
      )
  }

  // Required delegate methods from MicroPluginSettingsDelegate

  public loginDidSucceed(): void {
    this.display()
    new Notice('Micro.blog login succeeded.')
  }

  public loginDidFail(): void {
    this.display()
    new Notice('Micro.blog login failed.')
  }

  public logoutDidSucceed(): void {
    this.display()
  }

  public refreshDidSucceed(): void {
    this.display()
    new Notice('Blog list refreshed.')
  }

  public refreshDidFail(): void {
    this.display()
    new Notice('Failed to refresh blog list.')
  }
}
