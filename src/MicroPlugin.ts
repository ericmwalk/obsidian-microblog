import { MicroPluginContainer, MicroPluginContainerInterface } from '@base/MicroPluginContainer'
import { MicropostView } from '@base/views/MicropostView'
import { isMarkdownView, isPublishPageViewModel, isPublishPostViewModel, isUpdatePageViewModel, isUpdatePostViewModel } from '@extensions/TypeGuards'
import { ServiceFactory, ServiceFactoryInterface } from '@factories/ServiceFactory'
import { ViewModelFactory, ViewModelFactoryInterface } from '@factories/ViewModelFactory'
import { TagSynchronizationServiceInterface } from '@services/TagSynchronizationService'
import { StoredSettings, defaultSettings } from '@stores/StoredSettings'
import { ErrorView } from '@views/ErrorView'
import { MicroPluginSettingsView } from '@views/MicroPluginSettingsView'
import { PublishPageView } from '@views/PublishPageView'
import { PublishPostView } from '@views/PublishPostView'
import { UpdatePageView } from '@views/UpdatePageView'
import { UpdatePostView } from '@views/UpdatePostView'
import { Notice, Platform, Plugin } from 'obsidian'
import { uploadAndReplaceImages } from './images/UploadImagesCommand'

export default class MicroPlugin extends Plugin {
  private settings: StoredSettings
  private container: MicroPluginContainerInterface
  private viewModelFactory: ViewModelFactoryInterface
  private serviceFactory: ServiceFactoryInterface
  private synchronizationService: TagSynchronizationServiceInterface

  // Called when the plugin is loaded
  public async onload() {
    await this.loadSettings()
    await this.loadDependencies()
    await this.loadViewModelFactory()
    await this.loadServiceFactory()
    await this.registerSynchronizationService()

    if (this.settings.synchronizeCategoriesOnOpen) {
      this.synchronizationService.fetchTags()
    }

    // Command: Publish Post
    this.addCommand({
      id: 'microblog-publish-post-command',
      name: 'Publish Post to Micro.blog',
      editorCallback: (editor, markdownView) => {
        if (editor.getValue().trim().length === 0) {
          new ErrorView(this.viewModelFactory.makeEmptyPostErrorViewModel(), this.app).open()
        } else if (isMarkdownView(markdownView)) {
          const viewModel = this.viewModelFactory.makeSubmitPostViewModel(markdownView)
          if (isPublishPostViewModel(viewModel)) {
            new PublishPostView(viewModel, this.app).open()
          }
          if (isUpdatePostViewModel(viewModel)) {
            new UpdatePostView(viewModel, this.app).open()
          }
        }
      }
    })

    // Command: Publish Page
    this.addCommand({
      id: 'microblog-publish-page-command',
      name: 'Publish Page to Micro.blog',
      editorCallback: (editor, markdownView) => {
        if (editor.getValue().trim().length === 0) {
          new ErrorView(this.viewModelFactory.makeEmptyPageErrorViewModel(), this.app).open()
        } else if (isMarkdownView(markdownView)) {
          const viewModel = this.viewModelFactory.makeSubmitPageViewModel(markdownView)
          if (isPublishPageViewModel(viewModel)) {
            new PublishPageView(viewModel, this.app).open()
          }
          if (isUpdatePageViewModel(viewModel)) {
            new UpdatePageView(viewModel, this.app).open()
          }
        }
      }
    })

    // Command: Upload & Replace Images
    this.addCommand({
      id: 'microblog-upload-images',
      name: 'Micro.blog: Upload and Convert Attached Images',
      callback: () => {
        uploadAndReplaceImages(
          this.app,
          this.settings.appToken,
          this.settings.deleteAfterUpload,
          true, // AI alt text enabled by default — can toggle later
          this.settings.chatGPTApiKey
        )
      }
    })

    // Command: Synchronize Tags
    this.addCommand({
      id: 'microblog-categories-sync-command',
      name: 'Synchronize Categories',
      callback: () => {
        this.synchronizationService.fetchTags()
      }
    })

    // Desktop: Compose Micropost
    if (Platform.isDesktopApp) {
      this.addCommand({
        id: 'microblog-publish-compose-micropost',
        name: 'Compose Micropost',
        callback: () => {
          this.openMicropostView()
        }
      })

      this.addRibbonIcon('message-circle', 'Compose Micropost', () => {
        this.openMicropostView()
      })
    }

    // Plugin Settings UI
    this.addSettingTab(
      new MicroPluginSettingsView(
        this.viewModelFactory.makeMicroPluginSettingsViewModel(),
        this.app
      )
    )
  }

  // Plugin unload
  public onunload() {}

  // Save settings to disk
  public async saveSettings() {
    await this.saveData(this.settings)
  }

  // Allow setting updates from other components
  public async updateSetting<K extends keyof StoredSettings>(key: K, value: StoredSettings[K]): Promise<void> {
    this.settings[key] = value
    await this.saveSettings()
  }

  // Allow reading specific settings
  public getSetting<K extends keyof StoredSettings>(key: K): StoredSettings[K] {
    return this.settings[key]
  }

  // Success: tag synchronization
  public tagSynchronizationDidSucceed(count: number, blogsCount: number) {
    new Notice(`Categories synchronized. Found ${count} categories in ${blogsCount} blog(s).`)
  }

  // Fail: tag synchronization
  public tagSynchronizationDidFail(_error: Error) {
    new Notice('Error synchronizing categories')
  }

  // Internal: Load plugin settings
  private async loadSettings() {
    this.settings = Object.assign({}, defaultSettings, await this.loadData())
  }

  // Internal: Set up core container
  private async loadDependencies() {
    this.container = new MicroPluginContainer(this.settings, this)
  }

  // Internal: Set up view model factory
  private async loadViewModelFactory() {
    this.viewModelFactory = new ViewModelFactory(this.container)
  }

  // Internal: Set up service factory
  private async loadServiceFactory() {
    this.serviceFactory = new ServiceFactory(this.container)
  }

  // Internal: Start tag sync service
  private async registerSynchronizationService() {
    this.synchronizationService = this.serviceFactory.makeTagSynchronizationService(this)
  }

  // Modal: Compose Micropost
  private openMicropostView() {
    const viewModel = this.viewModelFactory.makeMicropostViewModel()
    new MicropostView(viewModel, this.app).open()
  }
}
