import { ConfigResponse } from '@networking/ConfigResponse';

export interface MicroPluginSettingsDelegate {
    loginDidSucceed(response: ConfigResponse): void;
    loginDidFail(error: Error): void;
    logoutDidSucceed(): void;
    refreshDidSucceed(response: ConfigResponse): void;
    refreshDidFail(error: Error): void;
}
