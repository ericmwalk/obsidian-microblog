import MicroPlugin from '@base/MicroPlugin'
import { ConfigResponse } from '@networking/ConfigResponse'
import { NetworkClientInterface } from '@networking/NetworkClient'
import { NetworkRequestFactory } from '@networking/NetworkRequestFactory'
import { StoredSettings } from '@stores/StoredSettings'
import { MicroPluginSettingsDelegate } from '../interfaces/MicroPluginSettingsDelegate'

/*
 * View model for the plugin settings screen.
 * Acts as a bridge between settings UI and plugin state.
 */
export class MicroPluginSettingsViewModel {
  public delegate?: MicroPluginSettingsDelegate

  public readonly plugin: MicroPlugin
  public readonly blogs: Record<string, string>
  public readonly appToken: string
  public readonly tags: string
  public readonly visibility: string
  public readonly selectedBlogID: string
  public readonly includePagesInNavigation: boolean
  public readonly synchronizeCategoriesOnOpen: boolean
  public readonly deleteAfterUpload: boolean

  private client: NetworkClientInterface
  private factory: NetworkRequestFactory
  private settings: StoredSettings

  constructor(
    plugin: MicroPlugin,
    settings: StoredSettings,
    client: NetworkClientInterface,
    factory: NetworkRequestFactory
  ) {
    this.plugin = plugin
    this.settings = settings
    this.client = client
    this.factory = factory

    this.blogs = settings.blogs
    this.appToken = settings.appToken
    this.tags = settings.defaultTags
    this.visibility = settings.postVisibility
    this.selectedBlogID = settings.selectedBlogID
    this.includePagesInNavigation = settings.includePagesInNavigation
    this.synchronizeCategoriesOnOpen = settings.synchronizeCategoriesOnOpen
    this.deleteAfterUpload = settings.deleteAfterUpload ?? false
  }

  public get hasAppToken(): boolean {
    return this.appToken.length > 0
  }

  /*
   * Validates the app token and updates plugin settings if successful.
   */
  public async validate(): Promise<void> {
    const request = this.factory.makeValidateAppTokenRequest(this.appToken)

    try {
      const response = await this.client.run<ConfigResponse>(request)

      // Convert destination[] into blogs map
      const blogs = Object.fromEntries(
        (response.destination || []).map(dest => [dest.uid, dest.name])
      )

      await this.plugin.updateSetting('appToken', this.appToken)
      await this.plugin.updateSetting('blogs', blogs)

      this.delegate?.loginDidSucceed(response)
    } catch (error: any) {
      this.delegate?.loginDidFail(error)
    }
  }

  /*
   * Logs the user out by clearing the stored token and blog list.
   */
  public async logout() {
    await this.plugin.updateSetting('appToken', '')
    await this.plugin.updateSetting('blogs', {})
    this.delegate?.logoutDidSucceed()
  }

  /*
   * Refreshes the list of available blogs.
   */
  public async refreshBlogs() {
    const request = this.factory.makeValidateAppTokenRequest(this.appToken)

    try {
      const response = await this.client.run<ConfigResponse>(request)

      const blogs = Object.fromEntries(
        (response.destination || []).map(dest => [dest.uid, dest.name])
      )

      await this.plugin.updateSetting('blogs', blogs)
      this.delegate?.refreshDidSucceed(response)
    } catch (error: any) {
      this.delegate?.refreshDidFail(error)
    }
  }

  /*
   * Updates the delete-after-upload setting.
   */
  public async setDeleteAfterUpload(value: boolean) {
    await this.plugin.updateSetting('deleteAfterUpload', value)
  }
}
