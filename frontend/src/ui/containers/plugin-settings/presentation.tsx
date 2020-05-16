import React from "react";
import styled from "styled-components";
import Subheader from "../../components/subheader";
import { Margin } from "styled-components-spacing";
import Heading from "../../components/heading";
import TextInput from "../../components/text-input";
import { leftPageMargin } from "../../styles/globals";
import {
  SettingField,
  SettingContent,
  PluginSettingsState,
  PluginSettingsHandlers,
} from "./types";
import TagInput from "../../components/tag-input";
import Checkbox from "../../components/checkbox";
import { PrimaryAction } from "../../components/buttons";

const StyledPluginSettings = styled.div``;
const Content = styled.div`
  margin-left: ${leftPageMargin};
`;

const SubheaderLeftArea = styled.div`
  display: flex;
  align-items: center;
`;
const SubheaderLogo = styled.div`
  background: black;
  border-radius: 19px;
  width: 38px;
  height: 38px;
`;
const SubheaderTitle = styled.div`
  font-weight: bold;
`;
const SubheaderActions = styled.div``;
const SubheaderAction = styled.div``;

const ConfigSection = styled.div``;
const ConfigSetting = styled.div``;
const ConfigSettingLine = styled.div``;

const EXCLUDE_LABELS_FOR: { [Type in SettingField["type"]]?: true } = {
  checkbox: true,
};

export default class PluginSettings extends React.PureComponent<{
  state: PluginSettingsState;
  handlers: PluginSettingsHandlers;
}> {
  renderSettingContents(
    contents: SettingContent[],
    options?: { isGroup?: boolean }
  ) {
    return contents.map((content, index) => (
      <Margin top={!options?.isGroup ? 4 : 2} key={index}>
        <ConfigSetting>
          {content.type !== "group" && this.renderField(content.field)}
          {content.type === "group" &&
            this.renderSettingContents(content.fields, { isGroup: true })}
        </ConfigSetting>
      </Margin>
    ));
  }

  renderField(fieldId: string) {
    const field = this.props.state.settings.fields[fieldId];
    return (
      <>
        {!EXCLUDE_LABELS_FOR[field.type] && (
          <ConfigSettingLine>{field.label}</ConfigSettingLine>
        )}
        <Margin top={!EXCLUDE_LABELS_FOR[field.type] ? 2 : 0}>
          <ConfigSettingLine>
            {this.renderFieldWidget(field, fieldId)}
          </ConfigSettingLine>
        </Margin>
      </>
    );
  }

  renderFieldWidget(field: SettingField, fieldId: string) {
    if (field.type === "text-input") {
      return (
        <TextInput
          value={field.value}
          onChange={(event) => {
            this.props.handlers.changeTextField({
              field: fieldId,
              newValue: event.target.value,
            });
          }}
        />
      );
    } else if (field.type === "tag-input") {
      return (
        <TagInput
          tags={field.value}
          suggestions={this.props.state.tagSuggestions[fieldId] || []}
          onExistingTagAdd={(event) =>
            this.props.handlers.addExistingTag({ tag: event, field: fieldId })
          }
          onTagRemove={(event) =>
            this.props.handlers.removeTag({ ...event, field: fieldId })
          }
          onTextChange={(event) => {
            this.props.handlers.queryTags({ field: fieldId, text: event.text });
          }}
        />
      );
    } else if (field.type === "checkbox") {
      return (
        <Checkbox
          label={field.label}
          value={field.value}
          onChange={(event) => {
            this.props.handlers.changeBooleanField({
              field: fieldId,
              newValue: event.target.checked,
            });
          }}
        />
      );
    } else {
      return null;
    }
  }

  render() {
    const saveLabel = {
      pristine: "Save",
      running: "Saving...",
      success: "Saved!",
      error: "Error  :(",
    }[this.props.state.saveState];

    return (
      <StyledPluginSettings>
        <Subheader>
          <SubheaderLeftArea>
            <SubheaderLogo />
            <Margin left={3}>
              <SubheaderTitle>{this.props.state.name}</SubheaderTitle>
            </Margin>
          </SubheaderLeftArea>
          <SubheaderActions>
            <SubheaderAction></SubheaderAction>
            <SubheaderAction></SubheaderAction>
            <SubheaderAction></SubheaderAction>
          </SubheaderActions>
        </Subheader>
        <Content>
          <Margin top={5}>
            {this.props.state.settings.sections.map((section) => (
              <ConfigSection key={section.title}>
                <Heading text={section.title} width="small" />
                {this.renderSettingContents(section.contents)}
              </ConfigSection>
            ))}
          </Margin>
          <Margin vertical={5}>
            <PrimaryAction
              label={saveLabel}
              disabled={this.props.state.saveState !== "pristine"}
              onClick={() => this.props.handlers.save()}
            />
          </Margin>
        </Content>
      </StyledPluginSettings>
    );
  }
}
