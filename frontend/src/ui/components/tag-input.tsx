import React from "react";
import { Tag } from "../types";
const ReactTags = require("react-tag-autocomplete");

interface TagInputProps {
  tags: Tag[];
  suggestions?: Tag[];
  placeholder?: string;
  onExistingTagAdd(event: Tag): void;
  onTagRemove(event: { id: Tag["id"]; index: number }): void;
  onNewTagAdd?(event: { name: string }): void;
  onTextChange?(event: { text: string }): void;
}

export default class TagInput extends React.Component<TagInputProps> {
  handleTagAdd = (tag: Tag) => {
    if (tag.id) {
      this.props.onExistingTagAdd(tag);
    } else {
      this.props.onNewTagAdd!({ name: tag.name });
    }
  };

  handleTagDelete = (index: number) => {
    if (index === -1) {
      return;
    }

    this.props.onTagRemove({
      id: this.props.tags[index].id,
      index,
    });
  };

  render() {
    return (
      <ReactTags
        placeholder={this.props.placeholder}
        tags={this.props.tags}
        suggestions={this.props.suggestions || []}
        autofocus={false}
        classNames={{
          // can be found in ui/styles/global.css
          root: "react-tags",
          rootFocused: "is-focused",
          selected: "react-tags__selected",
          selectedTag: "react-tags__selected-tag",
          selectedTagName: "react-tags__selected-tag-name",
          search: "react-tags__search",
          searchInput: "react-tags__search-input",
          suggestions: "react-tags__suggestions",
          suggestionActive: "is-active",
          suggestionDisabled: "is-disabled",
        }}
        allowNew={!!this.props.onNewTagAdd}
        handleDelete={this.handleTagDelete}
        handleAddition={this.handleTagAdd}
        handleInputChange={this.props.onTextChange || (() => {})}
      />
    );
  }
}
