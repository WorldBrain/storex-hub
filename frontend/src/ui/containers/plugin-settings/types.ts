import { UITaskState } from "../../utils/logic"
import { Tag } from "../../types"
import { Services } from '../../../services/types'

export interface PluginSettingsDependencies {
    appIdentifier: string
    services: Pick<Services, 'storexHub' | 'router'>
}

export interface PluginSettingsState {
    loadState: UITaskState;
    saveState: UITaskState;
    name: string;
    settings: Settings;
    tagSuggestions: { [field: string]: Array<{ id: number | string, name: string }> }
}

export interface PluginSettingsHandlers {
    changeTextField(event: { field: string, newValue: string }): void
    changeBooleanField(event: { field: string, newValue: boolean }): void
    addExistingTag(event: { field: string, tag: Tag }): void
    removeTag(event: { field: string, id: number | string, index: number }): void
    queryTags(event: { field: string, text: string }): void
    save(): void
}

export interface Settings {
    sections: SettingSection[]
    fields: { [id: string]: SettingField }
}

export interface SettingSection {
    title: string
    contents: Array<SettingContent>
}

export type SettingContent = SettingFieldReference | SettingGroup
export interface SettingFieldReference {
    type: 'field'
    field: string
}

export type SettingField = TextSettingField | TagSettingField | CheckboxField
export interface SettingFieldBase {
    label: string
    changed: boolean
}

export interface TextSettingField extends SettingFieldBase {
    type: 'text-input'
    value: string
}

export interface TagSettingField extends SettingFieldBase {
    type: 'tag-input'
    value: Tag[]
}

export interface CheckboxField extends SettingFieldBase {
    type: 'checkbox'
    value: boolean
}

export interface SettingGroup {
    type: 'group'
    label: string
    fields: SettingFieldReference[]
}
