import { SettingsDescription, SettingsDescriptionField, SettingDescriptionLayoutGroup } from "@worldbrain/storex-hub-interfaces/lib/settings";
import { Settings, SettingSection, SettingField, SettingGroup, SettingContent } from "./types";

export function translateSettingsDescriptionToUI(description: SettingsDescription): Settings {
    return {
        sections: translateSettingsLayoutToUI(description.layout),
        fields: translateSettingsFieldsToUI(description.fields),
    }
}

function translateSettingsGroupToUI(group: SettingDescriptionLayoutGroup): SettingGroup {
    return {
        type: 'group',
        label: group.group.title,
        fields: group.group.fields.map(({ field }) => ({ type: 'field', field }))
    }
}

function translateSettingsFieldsToUI(fields: SettingsDescription['fields']): Settings['fields'] {
    const translatedFields: Settings['fields'] = {}
    for (const [key, value] of Object.entries(fields)) {
        const translatedField = translateSettingsFieldToUI(value, key);
        if (translatedField) {
            translatedFields[key] = translatedField
        }
    }
    return translatedFields
}

function translateSettingsFieldToUI(fieldDescription: SettingsDescriptionField, id: string): SettingField | null {
    const common = {
        id,
        changed: false,
        type: fieldDescription.widget.type,
        label: fieldDescription.label,
    }

    const type = fieldDescription.widget.type
    if (type === 'text-input') {
        return { ...common, type, value: '' }
    }
    if (type === 'checkbox') {
        return { ...common, type, value: false }
    }
    if (type === 'tag-input') {
        return { ...common, type, value: [] }
    }

    return null
}

function translateSettingsLayoutToUI(layout: SettingsDescription['layout']): Array<SettingSection> {
    return layout.sections.map(section => {
        const translatedSection: SettingSection = {
            title: section.title, contents: section.contents.map(content => {
                let translatedContent: SettingContent
                if ('group' in content) {
                    translatedContent = translateSettingsGroupToUI(content);
                } else {
                    translatedContent = { type: 'field', field: content.field }
                }
                return translatedContent
            }).filter(content => !!content)
        };
        return translatedSection
    })
}
